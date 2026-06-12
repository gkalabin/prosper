#!/bin/bash
# Dump the Prosper database and push it to the backup repo. Invoked on the
# server by the db_backup systemd timer; the argument is a checkout of the
# git-pushable repo that stores the dumps. Connection settings come from the
# repo's .env, so pointing it at a local checkout backs up the dev DB too.
#
# Usage: backup.sh <backup-repo-checkout> [note]
# The optional note is included in the commit message.
set -euo pipefail

if [[ $# -lt 1 || $# -gt 2 ]]; then
  echo "Usage: $(basename "$0") <backup-repo-checkout> [note]" >&2
  exit 1
fi
repo=$1
note=${2:-}

cd "$(dirname "$0")/../.."
set -a
. ./.env
set +a
export MYSQL_PWD=$PROSPER_DB_PASSWORD

dump="$repo/latest.sql"
# Pull before dumping so the new dump lands on top of the latest remote state.
# Dumping first would leave it uncommitted across the rebase, where a conflicting
# autostash could discard it.
git -C "$repo" pull --rebase

mysqldump --host "$PROSPER_DB_HOST" --port "$PROSPER_DB_PORT" --user "$PROSPER_DB_USER" \
  --databases "$PROSPER_DB_NAME" --extended-insert=FALSE --result-file "$dump"
size=$(ls -lh "$dump" | awk '{print $5}')

git -C "$repo" add "$(basename "$dump")"
git -C "$repo" commit -m "[backup] ${note:+$note. }$(hostname). t: $(date -Iseconds), s: $size"
git -C "$repo" push
