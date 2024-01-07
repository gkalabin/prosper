# Prosper - personal expense tracking app

![build](https://github.com/gkalabin/prosper/actions/workflows/build.yml/badge.svg)
![tests](https://github.com/gkalabin/prosper/actions/workflows/tests.yml/badge.svg)

## Setup

Requirements:

- nodejs
- mysql

### MySQL setup

```
sudo mysql -e 'create database spentdb;'
sudo mysql -e 'create user spent;'
sudo mysql -e 'SET PASSWORD FOR spent = "somestrongpassword";'
sudo mysql -e 'grant all PRIVILEGES on spentdb.* to spent;'
sudo mysql spent < $(find ../spending-tracker-data-backups/database_backups/*sql | sort | tail -n1)
```

`.env` content:

    DATABASE_URL="mysql://spent:somestrongpassword@localhost:3306/spentdb"

TODO: add something
