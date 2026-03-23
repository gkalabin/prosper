#!/bin/bash
# Boots the backend + Next.js production server for Playwright runs.
# This script builds both services from source before starting them.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
. "$REPO_ROOT/scripts/_app_runtime.sh"

set -a
. "$REPO_ROOT/.env.e2e"
set +a

log "building backend..."
(cd "$REPO_ROOT/backend" && go build -o ./tmp/prosper-backend ./cmd/prosper-backend)
BACKEND_BIN="$REPO_ROOT/backend/tmp/prosper-backend"

log "building frontend..."
(cd "$REPO_ROOT" && npm run build > /dev/null)
FRONTEND_CMD="cd $REPO_ROOT && npm start"

app_run
