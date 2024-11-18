#!/bin/bash 
set -o errexit
set -o nounset
set -o pipefail

cd "$(dirname "$0")"
ENV_FILE="../.env"
ADMIN_HANDLER_SECRET=$(grep '^ADMIN_HANDLER_SECRET=' "$ENV_FILE" | cut -d '=' -f2-)
if [[ -z "$ADMIN_HANDLER_SECRET" ]]; then
  echo "Required ADMIN_HANDLER_SECRET environment variable is missing. Please check your .env file."
  exit 1
fi

curl -X POST -H "Authorization: Bearer $ADMIN_HANDLER_SECRET" "http://127.0.0.1:3000/api/_ratesz"
