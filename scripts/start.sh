#!/bin/sh
# Container entrypoint: launches the prebuilt backend + Next.js standalone
# frontend inside the production image. Both binaries are built at image-build
# time (see Dockerfile); this script only supervises the runtime processes.
set -e

cd "$(dirname "$0")"
. ./app_runtime.sh

BACKEND_BIN="/app/backend"
FRONTEND_CMD="node /app/frontend.js"

app_run
