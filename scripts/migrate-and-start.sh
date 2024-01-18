#!/bin/sh

if [ -n "$DB_HOST" ] && [ -n "$DB_PORT" ] && [ -n "$DB_USER" ] && [ -n "$DB_PASSWORD" ] && [ -n "$DB_NAME" ]; then
  export DB_URL="mysql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
fi

npx prisma migrate deploy --schema=/app/prisma/schema.prisma
# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
node /app/server.js