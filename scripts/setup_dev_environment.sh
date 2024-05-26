#!/bin/bash
# Installs the necessary tools required for local development.

set -o errexit
set -o nounset
set -o pipefail

if [[ "$OSTYPE" != "darwin"* ]]; then
  echo "Only MacOS is supported (feel free to contribute)"
  exit 1
fi

if [[ $# -lt 2 ]] || [[ "$1" != "--db_password" ]]; then
  echo "Usage: setup_dev_environment.sh --db_password <password>"
  exit 1
fi
DB_PASSWORD=$2

brew install mysql npm terraform typos-cli gitleaks
brew services start mysql

# DB setup.
sudo mysql -e 'CREATE USER prosper'
sudo mysql -e 'CREATE DATABASE prosperdb'
sudo mysql -e 'GRANT ALL PRIVILEGES ON prosperdb.* TO prosper'
sudo mysql -e "SET PASSWORD FOR prosper = \"$DB_PASSWORD\""
