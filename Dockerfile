FROM node:23.11.0-alpine3.21 AS base
# Prisma needs openssl both during runtime and build,
# hence install it in the base layer.
RUN apk add --no-cache openssl

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# To avoid exposing secrets in .env files explicitly remove all of the env files.
RUN rm -f .env*
RUN npx prisma generate
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
ENV NODE_ENV production
# Disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED 1
# Create a non-root user
RUN addgroup --system --gid 1001 prosper
RUN adduser --system --uid 1001 prosper
# Remove the annoying warning about using not the latest npm version.
RUN npm install -g npm
WORKDIR /app
# Copy public assets.
COPY --from=builder /app/public ./public
# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown prosper:prosper .next
# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=prosper:prosper /app/.next/standalone ./
COPY --from=builder --chown=prosper:prosper /app/.next/static ./.next/static
# Add prisma schema and migrations, so the DB migration can be run in CI/CD pipeline.
COPY --from=builder --chown=prosper:prosper /app/prisma/ ./prisma/
COPY --from=builder --chown=prosper:prosper /app/scripts/ ./scripts/

USER prosper
EXPOSE 3000
ENV PORT 3000
# set hostname to localhost
ENV HOSTNAME "0.0.0.0"

CMD ["./scripts/start.sh"]
