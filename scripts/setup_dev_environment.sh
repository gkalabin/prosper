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

brew install mysql npm terraform typos-cli gitleaks go bufbuild/buf/buf lefthook golangci-lint
go install github.com/air-verse/air@latest
go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.36.11
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@v1.6.2
brew services start mysql
# Wire lefthook as a git pre-commit hook (runs the lint suite on commit).
lefthook install

# DB setup.
sudo mysql -e 'CREATE USER prosper'
sudo mysql -e 'CREATE DATABASE prosperdb'
sudo mysql -e 'GRANT ALL PRIVILEGES ON prosperdb.* TO prosper'
sudo mysql -e "SET PASSWORD FOR prosper = \"$DB_PASSWORD\""
