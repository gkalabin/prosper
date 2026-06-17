#!/bin/bash
# Dump the Prosper database and push it to the backup repo. Invoked on the
# server by the db_backup systemd timer; the argument is a checkout of the
# git-pushable repo that stores the dumps.
#
# Connection settings are read from an env file: --env-file when given,
# otherwise the repo's own .env, so pointing it at a local checkout backs up the
# dev DB too.
#
# Usage: backup.sh [--env-file <path>] <backup-repo-checkout> [note]
# The optional note is included in the commit message.
set -euo pipefail

env_file=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file) env_file=$2; shift 2 ;;
    *) break ;;
  esac
done

if [[ $# -lt 1 || $# -gt 2 ]]; then
  echo "Usage: $(basename "$0") [--env-file <path>] <backup-repo-checkout> [note]" >&2
  exit 1
fi
repo=$1
note=${2:-}

# Default to the repo's own .env so a developer can run this straight from a
# checkout without passing --env-file.
env_file=${env_file:-"$(cd "$(dirname "$0")/../.." && pwd)/.env"}
set -a
. "$env_file"
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
