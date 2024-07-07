#!/bin/bash
set -euo pipefail

# Poor man's CI: infinitely polls the repo for updates and restarts the app;
# If there are new commits in the main branch pulls the repo and starts a new
# docker container in a detached mode using the commit hash as a tag.

# To avoid running this script at the wrong place by accident,
# explicitly require it to be run on the main branch with no changes.
if [ $(git rev-parse --abbrev-ref HEAD) != "main" ]; then
  echo "Not on the main branch, exiting."
  exit 1
fi
if [ -n "$(git status --porcelain)" ]; then
  echo "There are uncommitted changes, exiting."
  exit 1
fi

while true; do
  sleep 60
  git fetch
  if [ $(git rev-parse HEAD) = $(git rev-parse @{u}) ]; then
    echo "[$(date)] No incoming changes."
    continue
  fi
  echo "[$(date)] Latest commit is $(git rev-parse HEAD), trying to update."
  NEW_IMAGE="gkalabin/prosper:$(git rev-parse HEAD)"
  # If the pull fails probably the image is not built yet, skip the iteration and try again later.
  set +e
  docker pull "$NEW_IMAGE"
  PULL_EXIT_CODE=$?
  set -e
  if [ "$PULL_EXIT_CODE" -ne 0 ]; then
    echo "[$(date)] Pull failed, retrying later."
    continue
  fi
  git pull
  docker stop prosper-fe || true
  docker rm prosper-fe || true
  docker run --detach --rm --env-file .env --net=host "$NEW_IMAGE"
done
