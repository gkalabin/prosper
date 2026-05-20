#!/bin/bash
# Boots the backend + Next.js production server for Playwright runs.
# Builds both services from source before starting them.
set -euo pipefail

E2E_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$E2E_DIR/.." && pwd)"
. "$REPO_ROOT/scripts/app_runtime.sh"

set -a
. "$E2E_DIR/e2e.env"
set +a

log "building backend..."
(cd "$REPO_ROOT/backend" && go build -o ./tmp/backend ./cmd/backend)
BACKEND_BIN="$REPO_ROOT/backend/tmp/backend"

log "building frontend..."
(cd "$REPO_ROOT/frontend" && npm run build > /dev/null)
FRONTEND_CMD="cd $REPO_ROOT/frontend && npm start"

app_run
