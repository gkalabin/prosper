#!/bin/sh

if [ -n "$DB_HOST" ] && [ -n "$DB_PORT" ] && [ -n "$DB_USER" ] && [ -n "$DB_PASSWORD" ] && [ -n "$DB_NAME" ]; then
  export DB_URL="mysql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
fi

if [ -n "$PUBLIC_APP_URL" ]; then
  # It is impossible to set NEXTAUTH_URL at runtime (https://github.com/nextauthjs/next-auth/pull/1168).
  # There is already PUBLIC_APP_URL which has the public host (e.g. https://prosper.com), make NEXTAUTH_URL to use the same value.
  # Substitution is not an option as docker run --env-file does not support it.
  export NEXTAUTH_URL="${PUBLIC_APP_URL}"
fi

npx prisma migrate deploy --schema=/app/prisma/schema.prisma
# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
node /app/server.js