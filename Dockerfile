FROM node:21.6.1-alpine AS base

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
WORKDIR /app
ENV NODE_ENV production
# Disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED 1
# Create a non-root user
RUN addgroup --system --gid 1001 prosper
RUN adduser --system --uid 1001 prosper
# Remove the annoying warning about using not the latest npm version.
RUN npm install -g npm
# Copy public assets.
COPY --from=builder /app/public ./public
# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown prosper:prosper .next
# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=prosper:prosper /app/.next/standalone ./
COPY --from=builder --chown=prosper:prosper /app/.next/static ./.next/static
# Database migrations are run before starting the app inside the container,
# so the database changes can be applied in the CI/CD pipeline. This requires all the prisma related files.
COPY --from=builder --chown=prosper:prosper /app/prisma/ ./prisma/
RUN npm install -g prisma
COPY --from=builder --chown=prosper:prosper /app/scripts/migrate-and-start.sh ./scripts/migrate-and-start.sh
COPY --from=builder --chown=prosper:prosper /app/scripts/start.sh ./scripts/start.sh
COPY --from=builder --chown=prosper:prosper /app/scripts/migrate.sh ./scripts/migrate.sh

USER prosper
EXPOSE 3000
ENV PORT 3000
# set hostname to localhost
ENV HOSTNAME "0.0.0.0"

CMD ["./scripts/migrate-and-start.sh"]
