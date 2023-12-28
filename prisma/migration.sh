#!/bin/bash -x
set -e
cd $(dirname $0)
cat migration.sql | sudo mysql prosperdb
npx prisma db push
