<p align="center">
  <h1 align="center">Prosper</h1>
  <p align="center">The open-source, self-hosted personal finance app.</p>
</p>

<p align="center">
  <a href="https://github.com/gkalabin/prosper/actions/workflows/build.yml">
    <img src="https://github.com/gkalabin/prosper/actions/workflows/build.yml/badge.svg" alt="Build Status" />
  </a>
  <a href="https://github.com/gkalabin/prosper/actions/workflows/tests.yml">
    <img src="https://github.com/gkalabin/prosper/actions/workflows/tests.yml/badge.svg" alt="Tests Status" />
  </a>
  <a href="./LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" />
  </a>
</p>

> [!NOTE] > **TODO: Insert high-quality hero screenshot of the main dashboard
> here.** > _Should show: Net worth summary, recent activity, and a clean,
> modern UI._

## Why Prosper?

**Stop using spreadsheets.** Prosper is built for people who want complete
control over their financial data without sacrificing the user experience.

- **Own your data.** Self-hosted on your own infrastructure. No third-party
  tracking.
- **Track everything.** Cash, banks, stocks, ETFs, and crypto in one place.
- **Automate.** Sync with 2,000+ banks via Open Banking (Starling, Nordigen,
  TrueLayer).

## Features

- 💸 **Advanced Expense Tracking** – Granular categories, tagging, and powerful
  filters.
- 🌍 **Multi-Currency** – Real-time FX rates. See your net worth in any
  currency.
- 🏦 **Open Banking** – Auto-import transactions. Say goodbye to manual entry.
- 📈 **Wealth Management** – Track your portfolio performance (Stocks & ETFs).
- ✈️ **Trips Mode** – Dedicated budgeting for travel and vacations.
- 🔒 **Privacy First** – Your data never leaves your server.

## Screenshots

> **TODO: Screenshot of Transactions View** > _Show: filtering interface,
> category icons, and transaction list._

> **TODO: Screenshot of Analytics/Stats** > _Show: Spending breakdown charts by
> category and currency over time._

> **TODO: Screenshot of Trips View** > _Show: Expenses grouped by a specific
> vacation or business trip._

## Tech Stack

Built with the bleeding edge of the React ecosystem.

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **UI:** [React 19](https://react.dev/),
  [Tailwind CSS](https://tailwindcss.com/)
- **Database:** [MariaDB](https://mariadb.org/) +
  [Prisma](https://www.prisma.io/)
- **Infrastructure:** [Docker](https://www.docker.com/)

## Quick Start

The fastest way to get started is with Docker Compose.

```bash
# 1. Clone the repo
git clone https://github.com/gkalabin/prosper.git
cd prosper

# 2. Configure environment
cp .env.docker.example .env
# Edit .env with your DB password and preferences

# 3. Lift off 🚀
docker compose up -d
```

Visit `http://localhost:3000` to start prospering.

## Local Development

Want to contribute? Great!

```bash
# Install dependencies
npm install

# Spin up the DB
npx prisma db push

# Start the dev server
npm run dev
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first to
discuss what you would like to change.

Please make sure to update tests as appropriate.

## License

[MIT](https://choosealicense.com/licenses/mit/)
