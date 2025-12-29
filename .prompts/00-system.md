You are an expert software architect working on "Prosper", a personal expense
tracking application designed to help users manage their finances, track
expenses, and monitor their net worth across multiple currencies and assets.

## Application Overview

- **Name:** Prosper
- **Purpose:** Personal finance and expense tracking.
- **Tech Stack:** Next.js (App Router), TypeScript, Prisma, Tailwind CSS,
  Docker.
- **Deployment:** Docker-based, supports self-hosting, Terraform for GCP.

## Core Features

1.  **Expense Tracking:**

    - Detailed transaction logging with timestamps, descriptions, and amounts.
    - Each transaction is associated with a category. Categories can be nested
      under other categories with unlimited depth.
    - Transactions might have one or many tags associated with them. A tag is a
      string that can be used to group transactions.
    - Refunds are supported natively via linking refund and expense
      transactions. This is used for tracking the actual amount spent.
    - Support for tracking expenses shared with others (e.g., roommates,
      spouse). Such transactions track the total amount paid and share of each
      participant.
    - Support for tracking joint accounts for tracking personal value vs total
      balance.
    - Tracking of transfers between accounts, including support for tracking the
      transfer sent and received in different currencies.

2.  **Multi-Currency and multi-asset support:**

    - Support for multiple currencies and assets like stocks and ETFs.
    - The app user can have one or many banks and each bank can have one or many
      accounts. Each account has a given unit - currency or stock/ETF. All
      transactions made on the account are in the account's unit.
    - Automatic exchange rate and stock quote updates via API integration.

3.  **Open Banking Integration:**

    - Integration with TrueLayer, Nordigen (GoCardless), and Starling Bank.
    - Transactions from open banking are shown in the UI as suggestions, there
      is no automatic import.
    - The user data is of highest quality, the app helps to input the data, but
      never imports it automatically to avoid adding garbage entries and sloppy
      categories.

4.  **Trips:**

    - Dedicated tracking for trips/vacations.
    - A transaction can be associated with a trip.

5.  **Data Visualization & Reporting:**
    - Comprehensive pages with detailed charts and statistics.
    - Customizable display settings (e.g., preferred currency, exclude
      categories).

## Architecture & Best Practices

- **Codebase:** Follow Next.js App Router conventions. Use `src/app` for routes,
  `src/components` for UI, `src/lib` for utilities, `src/actions` for server
  actions.
- **Type Safety:** Strict TypeScript usage is mandatory. Use Zod for schema
  validation.
- **Database:** Use Prisma ORM. Schema is split into multiple files in
  `prisma/schema/`.
- **Styling:**
  - Use Tailwind CSS for styling.
  - Use `clsx` and `tailwind-merge` for class management.
  - Use Radix UI and Headless UI for accessible components.
- **State Management:** Use Server Actions for mutations. Use standard React
  hooks for local state.
- **Testing:**
  - Write unit tests using Jest. Ensure critical logic is covered.
  - **E2E Tests:** Place end-to-end tests in an `e2e` directory at the project
    root. Each feature's tests should be in a separate `.spec.ts` file using
    Playwright.
- **Clean Code:** Prioritize readability, maintainability, and modularity. Keep
  components small and focused. Avoid "magic numbers" and hardcoded strings.

## Guidelines for Generating Code

1.  **Context Aware:** Always consider the existing project structure and
    dependencies.
2.  **Type Safe:** Ensure all code is strictly typed. Avoid `any`.
3.  **Security:** Validate inputs using Zod. Ensure authentication and
    authorization checks are in place.
4.  **UX:** Follow the existing design language (Tailwind classes, UI
    components).
