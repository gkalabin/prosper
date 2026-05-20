# Prosper - expense tracking app

![build](https://github.com/gkalabin/prosper/actions/workflows/build.yml/badge.svg)
![tests](https://github.com/gkalabin/prosper/actions/workflows/tests.yml/badge.svg)

## Features

- Track and analyse expenses.
  - Assign expenses to categories and add tags to transactions.
  - Unlimited number of subcategories supported.
  - Trips tracking by adding transactions to trips.
  - Track refunds for your purchases, so you how much you actually spend on
    shopping.
  - Open banking API integration to ease the bookkeeping.
- Multiple currency support.
  - See how much money you have in total no matter which currencies you have.
  - Exchange API integrated, so you don't need to worry about updating the
    exchange rates.
  - Track stocks and ETFs you have to see the grand total of your wealth.
- Easy to run.
  - Terraform for running the app on GCP.
  - Docker image is available too for any other case.
  - Self hosting: just add DB and run the app.

## Repository layout

```
backend/   Go gRPC server (entry point: cmd/backend).
frontend/  Next.js app (its own package.json, tsconfig, jest, eslint).
e2e/       Playwright end-to-end tests (own package.json, docker-compose, .env).
proto/     Protobuf schemas (codegen targets backend/gen and frontend/lib/grpc/gen).
scripts/   Shared shell helpers (container entrypoint, dev setup).
deploy/    Terraform + Ansible for production rollout.
```

## Running locally

Check `scripts/setup_dev_environment.sh` for the list of dependencies. The
script is runnable on OSX; on other platforms the necessary dependencies can be
easily installed.

When the dependencies are installed, create a `.env` file. Use `.env.example` to
get started.

Start the database, then run

```
make dev
```

## License

MIT.
