#!/usr/bin/env bash
# Roll out the latest published image for the tracked branch.
#
# Run as a oneshot by prosper-update.timer. Each tick resolves the branch tip on
# the remote and, when a newer image has been published, pulls it and restarts
# the app. Reading the tip with git ls-remote keeps the rollout stateless: there
# is no server-side checkout to fall out of sync with the image actually running.
#
# Output goes to the journal (journalctl -u prosper-update) for debugging.
set -euo pipefail

: "${PROSPER_BRANCH:?PROSPER_BRANCH is not set}"
: "${PROSPER_IMAGE_REPO:?PROSPER_IMAGE_REPO is not set}"
: "${PROSPER_GIT_REMOTE:?PROSPER_GIT_REMOTE is not set}"
: "${PROSPER_IMAGE_ENV:?PROSPER_IMAGE_ENV is not set}"

# Branch tip straight from the remote. A network blip or a branch that no longer
# exists fails the tick (--exit-code turns an empty result into an error) rather
# than passing silently; the timer retries on the next run.
target=$(git ls-remote --exit-code "$PROSPER_GIT_REMOTE" "refs/heads/$PROSPER_BRANCH" | cut -f1)
# TODO: log prosper branch before the statement above and change the logging below not to be awkward.
echo "Tracking $PROSPER_BRANCH at $target"

. "$PROSPER_IMAGE_ENV"
if [ "${PROSPER_IMAGE-}" = "$PROSPER_IMAGE_REPO:$target" ]; then
  echo "Already running $PROSPER_IMAGE, nothing to do"
  exit 0
fi

echo "Updating from ${PROSPER_IMAGE-<none>} to $PROSPER_IMAGE_REPO:$target"
docker pull "$PROSPER_IMAGE_REPO:$target"
echo "PROSPER_IMAGE=$PROSPER_IMAGE_REPO:$target" > "$PROSPER_IMAGE_ENV"
systemctl restart prosper
echo "Restarted prosper on $PROSPER_IMAGE_REPO:$target"
