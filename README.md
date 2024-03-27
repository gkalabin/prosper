# Prosper - personal expense tracking app

![build](https://github.com/gkalabin/prosper/actions/workflows/build.yml/badge.svg)
![tests](https://github.com/gkalabin/prosper/actions/workflows/tests.yml/badge.svg)

Personal expense tracking app you can fully own. Built with:

 - Nextjs
 - Tailwindcss
 - Mysql as the storage
 - Terraform for deploying on GCP

### MySQL setup

When running locally, create the user and grant it the right priviliges, something like:

```
$ sudo mysql -e 'create database prosperdb;'
$ sudo mysql -e 'create user prosper;'
$ sudo mysql -e 'SET PASSWORD FOR prosper = "somestrongpassword";'
$ sudo mysql -e 'grant all PRIVILEGES on prosperdb.* to prosper;'
$ npx prisma db push
```
