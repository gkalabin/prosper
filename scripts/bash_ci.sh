#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

# Poor man's CI: infinitely polls the repo for updates and restarts the app;
# If there are new commits in the current branch pulls the repo and starts a new
# docker container in a detached mode using the commit hash as a tag.

if [ -n "$(git status --porcelain)" ]; then
  echo "There are uncommitted changes, exiting."
  exit 1
fi

# If there is no prosper FE running, start it without waiting for the next iteration.
if [ -z "$(docker ps --filter name=prosper-fe --format '{{.ID}}')" ]; then
  echo "No prosper FE container running, starting one from docker registry."
  # Try starting the prebuilt image, but if it fails, build the image ourselves.
  IMAGE="gkalabin/prosper:$(git rev-parse HEAD)"
  set +e
  docker run --detach --rm --env-file .env --net host --name prosper-fe "$IMAGE"
  if [ $? -ne 0 ]; then
    echo "Failed to start the prebuilt image, building the image ourselves."
    cd "$(dirname "$0")/.."
    docker build -f Dockerfile -t "$IMAGE" .
    docker run --detach --rm --env-file .env --net host --name prosper-fe "$IMAGE"
  fi
  set -e
fi

echo "[$(date)] Watching for changes in branch $(git branch --show-current)."

while true; do
  sleep 60
  # Try fetching the changes, but if there is no connection to the remote, skip the iteration and rety next time.
  git fetch || continue
  if [ $(git rev-parse HEAD) = $(git rev-parse @{u}) ]; then
    echo "[$(date)] No incoming changes."
    continue
  fi
  echo "[$(date)] Latest commit is $(git rev-parse @{u}), trying to update."
  NEW_IMAGE="gkalabin/prosper:$(git rev-parse @{u})"
  # If the pull fails probably the image is not built yet, skip the iteration and try again later.
  set +e
  docker pull "$NEW_IMAGE"
  PULL_EXIT_CODE=$?
  set -e
  if [ "$PULL_EXIT_CODE" -ne 0 ]; then
    echo "[$(date)] Pull failed, retrying later."
    continue
  fi
  # If the migrations have changed, run them before restarting the app.
  if [ -n "$(git diff --name-only $(git rev-parse @{u}) prisma/migrations)" ]; then
    echo "[$(date)] Migrations have changed, running DB migration."
    ./scripts/docker_migrate.sh --env .env --image "$NEW_IMAGE"
  fi
  # Use rebase to handle force pushes in development branches, e.g. after rebasing on top of main.
  git pull --rebase
  docker stop prosper-fe || true
  docker rm prosper-fe || true
  docker run --detach --rm --env-file .env --net=host --name prosper-fe "$NEW_IMAGE"
done
