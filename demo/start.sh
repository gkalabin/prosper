#!/bin/bash
set -euo pipefail

# Always start in the project root
cd "$(dirname "$0")/.."

echo "Starting demo instance..."

# 1. Start DB
echo "Starting database (docker-compose.e2e.yml)..."
docker compose -f docker-compose.e2e.yml up -d --wait db

# 2. Run Migrations
echo "Running migrations..."
dotenv -e .env.e2e -- npx prisma migrate deploy

# 3. Apply Demo Data
echo "Seeding demo data..."
cat demo/demo.sql | docker exec -i prosper-e2e-test-db mysql -uroot -proot prosper_e2e_test_db

# 4. Start App
echo "Starting application..."
npm run e2e:app:dev
