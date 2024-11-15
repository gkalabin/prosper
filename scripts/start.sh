#!/bin/sh

# Always start in the scripts folder.
cd "$(dirname $0)"
# Expose correct database connection url constructed from parts like hostname, user, etc.
source ./_db_url_setup.sh

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
node /app/server.js
