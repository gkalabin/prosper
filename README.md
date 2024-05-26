# Prosper - expense tracking app

![build](https://github.com/gkalabin/prosper/actions/workflows/build.yml/badge.svg)
![tests](https://github.com/gkalabin/prosper/actions/workflows/tests.yml/badge.svg)

## Features

- Track and analyse expenses.
  - Assign expenses to categories and add tags to transactions.
  - Unlimited number of subcategories supported.
  - Trips tracking by adding transactions to trips.
  - Track refunds for your purchases, so you how much you actually spend on shopping.
  - Open banking API integration to ease the bookkeeping.
- Multi currency support.
  - See how much money you have in total no matter which currencies you have.
  - Exchange API integrated, so you don't need to worry about updating the exchange rates.
  - Track stocks and ETFs you have to see the grand total of your wealth.
- Easy to run.
  - Terraform for running the app on GCP.
  - Docker image is available too for any other case.
  - Self hosting: just add DB and run the app.

## Running locally

Check scripts/setup_dev_environment.sh for the list of dependencies. The script is runnable on OSX, on other platforms the necessary dependencies can be easily installed.

When the dependencies are installed, create `.env` file. Use `.env.docker.example` or `.env.local-development.example` to get started.

Start the database, then run

```
npx prisma db push
npm run dev
```

## License

MIT.
