#!/bin/bash
# Restore the Prosper database from a backup. Takes a safety dump of the current
# DB first, then loads latest.sql from the backup repo checkout. With --if-empty
# the restore is skipped when the database already has users, so it is safe to
# run on every provision to seed only fresh hosts. Connection settings come from
# the repo's .env, so this works both on the server and on a laptop against the
# local dev DB.
#
# Usage: restore.sh [--if-empty] <backup-repo-checkout>
#
# Exit codes: 0 if the database was restored, 2 if --if-empty found it already
# populated and made no change, non-zero otherwise. Automation keys off these
# instead of parsing the log output.
set -euo pipefail

if_empty=false
if [[ "${1:-}" == "--if-empty" ]]; then
  if_empty=true
  shift
fi

if [[ $# -ne 1 ]]; then
  echo "Usage: $(basename "$0") [--if-empty] <backup-repo-checkout>" >&2
  exit 1
fi
repo=$1
dump="$repo/latest.sql"
[[ -f "$dump" ]] || {
  echo "No latest.sql found under $repo" >&2
  exit 1
}

cd "$(dirname "$0")/../.."
set -a
. ./.env
set +a
export MYSQL_PWD=$PROSPER_DB_PASSWORD

if [[ "$if_empty" == true ]]; then
  # A fresh host has no User table yet, so a failed count means an empty DB.
  users=$(mysql --host "$PROSPER_DB_HOST" --port "$PROSPER_DB_PORT" --user "$PROSPER_DB_USER" \
    --skip-column-names --batch \
    -e "SELECT COUNT(*) FROM \`$PROSPER_DB_NAME\`.\`User\`" 2>/dev/null || echo 0)
  if [[ "$users" -gt 0 ]]; then
    echo "$PROSPER_DB_NAME already has $users users, skipping restore"
    exit 2
  fi
fi

safety="/tmp/before_restore_$(date +%Y_%m_%d__%H_%M_%S).sql"
mysqldump --host "$PROSPER_DB_HOST" --port "$PROSPER_DB_PORT" --user "$PROSPER_DB_USER" \
  --databases "$PROSPER_DB_NAME" --extended-insert=FALSE --result-file "$safety"
echo "Current database dumped to $safety"

mysql --host "$PROSPER_DB_HOST" --port "$PROSPER_DB_PORT" --user "$PROSPER_DB_USER" <"$dump"
echo "Restored $PROSPER_DB_NAME from $dump"
