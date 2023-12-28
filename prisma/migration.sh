#!/bin/bash -x
set -e
cd $(dirname $0)
npx prisma db push
cat migration.sql | sudo mysql prosperdb
