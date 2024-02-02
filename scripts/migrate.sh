#!/bin/sh

# Always start in the scripts folder.
cd "$(dirname $0)"
# Expose correct database connection url constructed from parts like hostname, user, etc.
source ./_db_url_setup.sh

npx prisma migrate deploy --schema=/app/prisma/schema.prisma
