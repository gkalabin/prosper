#!/bin/sh

if [ -n "$DB_URL" ]; then
  echo "DB_URL is already set, skipping setting it up."
elif [ -n "$DB_HOST" ] && [ -n "$DB_PORT" ] && [ -n "$DB_USER" ] && [ -n "$DB_PASSWORD" ] && [ -n "$DB_NAME" ]; then
  # The parts are set by terraform via env vars and the password is set in the secret, so concatenating it in terraform is not an option.
  # Connect using host and port if provided.
  export DB_URL="mysql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
elif [ -n "$DB_SOCKET_PATH" ] && [ -n "$DB_USER" ] && [ -n "$DB_PASSWORD" ] && [ -n "$DB_NAME" ]; then
  # Connect using socket, localhost is required and ignored by prisma.
  # See https://www.prisma.io/docs/orm/overview/databases/mysql#connecting-via-sockets.
  export DB_URL="mysql://$DB_USER:$DB_PASSWORD@localhost/$DB_NAME?socket=$DB_SOCKET_PATH"
fi
