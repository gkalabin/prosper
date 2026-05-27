# syntax=docker/dockerfile:1.6

# $BUILDPLATFORM resolves to the host's platform. Stages pinned to it run natively on the host instead
# of $TARGETPLATFORM emulation, which is orders of magnitude slower. Safe to pin any stage
# whose output is platform-independent or is explicitly cross-compiled for $TARGETPLATFORM.

# ── Go build stage ──
FROM --platform=$BUILDPLATFORM golang:1.25-alpine AS go-builder
ARG TARGETOS
ARG TARGETARCH
RUN apk add --no-cache git
WORKDIR /build
COPY backend/go.mod backend/go.sum ./backend/
RUN cd backend && go mod download
COPY backend/ ./backend/
RUN cd backend && CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH \
    go build -o /prosper-backend ./cmd/prosper-backend

# ── Node base ──
FROM node:24.15.0-alpine3.23 AS base

# Install dependencies only when needed.
FROM --platform=$BUILDPLATFORM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM --platform=$BUILDPLATFORM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# To avoid exposing secrets in .env files explicitly remove all of the env files.
RUN rm -f .env*
RUN npm run build

# Production image, copy all the files and run next + go
FROM base AS runner
ENV NODE_ENV=production
# Disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED=1
# Create a non-root user
RUN addgroup --system --gid 1001 prosper
RUN adduser --system --uid 1001 prosper
# Remove npm entirely to avoid vulnerabilities in bundled dependencies
# as we don't need npm in the runtime container.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
WORKDIR /app
# Copy public assets.
COPY --from=builder /app/public ./public
# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown prosper:prosper .next
# Frontend.
COPY --from=builder --chown=prosper:prosper /app/.next/standalone ./
COPY --from=builder --chown=prosper:prosper /app/.next/static ./.next/static
COPY --from=builder --chown=prosper:prosper /app/scripts/ ./scripts/
# Backend.
COPY --from=go-builder --chown=prosper:prosper /prosper-backend /app/prosper-backend

USER prosper
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["./scripts/start.sh"]
