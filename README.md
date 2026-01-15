# Prosper - Your Personal Finance Control Center

![build](https://github.com/gkalabin/prosper/actions/workflows/build.yml/badge.svg)
![tests](https://github.com/gkalabin/prosper/actions/workflows/tests.yml/badge.svg)

Prosper is a powerful, self-hosted personal finance manager designed to give you
complete control over your financial life. Unlike simple expense trackers,
Prosper integrates open banking, multi-currency wealth tracking, and deep
analytics into a single, privacy-focused dashboard.

Whether you're tracking daily coffee runs, managing investments across multiple
currencies, or budgeting for your next big trip, Prosper provides the insights
you need to build wealth.

## Features

- **Advanced Expense Tracking**:
  - Categorize expenses with unlimited subcategories.
  - Tag transactions for flexible grouping and reporting.
  - Track refunds to see your true net spending.
- **Multi-Currency Wealth Management**:
  - Unified view of your net worth across all your accounts and currencies.
  - Real-time exchange rates integration.
  - Track Stocks and ETFs alongside your cash assets.
- **Open Banking Integration**:
  - Connect your bank accounts (via Starling, Nordigen, etc.) to automatically
    import transactions.
  - Say goodbye to manual data entry.
- **Travel & Trip Budgeting**:
  - Dedicated mode for tracking expenses during trips.
  - Separate reporting to keep your vacation spending clear.
- **Privacy First**:
  - Self-hosted on your own infrastructure.
  - Your financial data never leaves your control.

## Screenshots

> TODO: Screenshot of the Overview Dashboard showing total wealth summary,
> recent activity feed, and quick stats cards.

> TODO: Screenshot of the Transactions List showing the filtering interface,
> category icons, and transaction details.

> TODO: Screenshot of the Analytics/Stats page showing spending breakdown charts
> by category and currency over time.

> TODO: Screenshot of the Trips view showing expenses grouped by a specific
> vacation or business trip.

## Tech Stack

Built with modern, high-performance technologies:

- **Frontend**: [Next.js 16](https://nextjs.org/) (App Router),
  [React 19](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/),
  [Headless UI](https://headlessui.com/).
- **Backend**: Next.js Server Actions, [Prisma ORM](https://www.prisma.io/).
- **Database**: MariaDB (compatible with MySQL/PostgreSQL).
- **Infrastructure**: [Docker](https://www.docker.com/),
  [Ansible](https://www.ansible.com/), [Terraform](https://www.terraform.io/).
- **Testing**: [Playwright](https://playwright.dev/) (E2E),
  [Jest](https://jestjs.io/) (Unit).

## Getting Started

### Using Docker (Recommended)

The easiest way to get up and running is with Docker Compose.

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/gkalabin/prosper.git
    cd prosper
    ```

2.  **Configure environment:**

    ```bash
    cp .env.docker.example .env
    # Edit .env and set your secure passwords and configuration
    ```

3.  **Start the services:**

    ```bash
    docker compose up -d
    ```

    The app will be available at `http://localhost:3000`.

### Local Development

For contributors or those who want to run without Docker containers for the app
itself.

1.  **Prerequisites:** Node.js 20+, MariaDB/MySQL.
2.  **Setup Environment:**

    ```bash
    cp .env.local-development.example .env
    # Update .env with your local database credentials
    ```

3.  **Install Dependencies:**

    ```bash
    npm install
    ```

4.  **Initialize Database:**

    ```bash
    npx prisma db push
    ```

5.  **Run Development Server:**

    ```bash
    npm run dev
    ```

## Deployment

- **Self-Hosting (Ansible)**: Check `deploy/ansible` for playbooks to deploy to
  your own VPS or Raspberry Pi.
- **Cloud (GCP)**: Check `deploy/gcp-continuous-deployment` for Terraform
  configuration to deploy to Google Cloud Platform.

## Contributing

Contributions are welcome! Please ensure your code passes all checks before
submitting a PR.

- **Run all checks (Lint, Types, Format)**:
  ```bash
  npm run lint
  ```
- **Run Unit Tests**:
  ```bash
  npm test
  ```
- **Run E2E Tests**:
  ```bash
  npm run test:e2e
  ```

## License

MIT.
