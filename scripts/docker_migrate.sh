#!/bin/bash
set -euo pipefail

# Applies the DB migration by building a docker image with prisma required to run the migration and runs the migration script.
# Accepts the following arguments:
#   --env: The environment file to use for running the migration. This file should contain the DB access credentials.
#   --image: The image of the docker container to use as a base for running migration. This is just the app image.

while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    --env)
      ENV_FILE="$2"
      shift
      shift
      ;;
    --image)
      IMAGE="$2"
      shift
      shift
      ;;
    *)
      echo "Unknown argument: $1"
      exit 1
      ;;
  esac
done
if [ -z "$ENV_FILE" ]; then
  echo "Environment file not provided"
  exit 1
fi
if [ -z "$IMAGE" ]; then
  echo "Image not provided"
  exit 1
fi
cd "$(dirname "$0")/.."

# Build the image to run the migration.
MIGRATION_DOCKERFILE="$(mktemp)"
MIGRATION_IMAGE="$IMAGE-dbmigrate"
echo "FROM ${IMAGE}" > "$MIGRATION_DOCKERFILE"
echo "RUN npm install -g prisma" >> "$MIGRATION_DOCKERFILE"
docker build -f "$MIGRATION_DOCKERFILE" -t "$MIGRATION_IMAGE" .

# Run the migration.
docker run -it --rm --env-file "$ENV_FILE" --net=host "$MIGRATION_IMAGE" /app/scripts/migrate.sh