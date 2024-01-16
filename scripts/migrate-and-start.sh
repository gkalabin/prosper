#!/bin/sh
npx prisma generate --schema=/app/prisma/schema.prisma
npx prisma migrate deploy --schema=/app/prisma/schema.prisma
# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
node /app/index.js