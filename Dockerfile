# syntax=docker/dockerfile:1.6

# ── Go backend build ──
FROM golang:1.25-alpine AS backend-builder
RUN apk add --no-cache git
WORKDIR /build
COPY backend/go.mod backend/go.sum ./backend/
RUN cd backend && go mod download
COPY backend/ ./backend/
RUN cd backend && CGO_ENABLED=0 go build -o /out/backend ./cmd/backend

# ── Node base ──
FROM node:26.3.1-alpine3.23 AS node-base
# Patch OS packages to pick up security fixes published after the base image.
RUN apk upgrade --no-cache

# ── Frontend dependencies ──
FROM node-base AS frontend-deps
RUN apk add --no-cache libc6-compat
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# ── Frontend build ──
FROM node-base AS frontend-builder
WORKDIR /app
COPY --from=frontend-deps /app/frontend/node_modules ./frontend/node_modules
COPY frontend/ ./frontend/
# Avoid leaking any env files into the production image.
RUN rm -f .env* frontend/.env*
RUN cd frontend && npm run build
# Standalone output emits server.js — rename to frontend.js so the backend
# binary and the Node entrypoint have distinct, descriptive names.
RUN mv frontend/.next/standalone/server.js frontend/.next/standalone/frontend.js

# ── Runtime image ──
FROM node-base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 prosper
RUN adduser --system --uid 1001 prosper
# npm is not needed at runtime; remove to shrink attack surface.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
WORKDIR /app

# Public assets and prerender cache.
COPY --from=frontend-builder /app/frontend/public ./public
RUN mkdir .next && chown prosper:prosper .next

# Frontend (standalone Node server + static assets).
COPY --from=frontend-builder --chown=prosper:prosper /app/frontend/.next/standalone ./
COPY --from=frontend-builder --chown=prosper:prosper /app/frontend/.next/static ./.next/static

# Backend binary.
COPY --from=backend-builder --chown=prosper:prosper /out/backend /app/backend

# Container entrypoint.
COPY --chown=prosper:prosper scripts/app_runtime.sh scripts/start.sh ./scripts/

USER prosper
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
# Internal unix socket for the in-container backend ↔ frontend gRPC channel.
# The backend, frontend, and entrypoint all read it from the environment, so
# define it once here; it never leaves the container.
ENV PROSPER_GRPC_SOCKET_PATH=/tmp/prosper.sock

CMD ["./scripts/start.sh"]
