#!/bin/sh

# Always start in the scripts folder.
cd "$(dirname $0)"
# Expose correct database connection url constructed from parts like hostname, user, etc.
source ./_db_url_setup.sh

# It is impossible to set NEXTAUTH_URL at runtime (https://github.com/nextauthjs/next-auth/pull/1168).
# There is already PUBLIC_APP_URL which has the public host (e.g. https://prosper.com), make NEXTAUTH_URL to use the same value.
# Substitution is not an option as docker run --env-file does not support it.
if [ -n "$PUBLIC_APP_URL" ]; then
  export NEXTAUTH_URL="${PUBLIC_APP_URL}"
fi

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
node /app/server.js
