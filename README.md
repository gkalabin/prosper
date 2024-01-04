# Spent - a spending tracker

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
