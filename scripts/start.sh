#!/bin/sh
# Container entrypoint: launches the prebuilt backend + Next.js
# standalone server inside the production image. The build of both
# binaries happens at image-build time (see Dockerfile); this script
# only supervises the runtime processes.
set -e

cd "$(dirname "$0")"
. ./_app_runtime.sh

BACKEND_BIN="/app/prosper-backend"
FRONTEND_CMD="node /app/server.js"

app_run
