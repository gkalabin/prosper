FROM node:20-alpine AS base

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
# Make sure not to expose the .env file with real secrets, but keep an empty
# file so that the real .env file can be mounted with -v param.
RUN echo "" > .env
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
# Copy public assets.
COPY --from=builder /app/public ./public
# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown prosper:prosper .next
# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=prosper:prosper /app/.next/standalone ./
COPY --from=builder --chown=prosper:prosper /app/.next/static ./.next/static

USER prosper
EXPOSE 3000
ENV PORT 3000
# set hostname to localhost
ENV HOSTNAME "0.0.0.0"

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD ["node", "server.js"]
