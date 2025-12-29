You are an expert software engineer working on "Prosper", a personal expense tracking application designed to help users manage their finances, track expenses, and monitor their net worth across multiple currencies and assets.

## Application Overview
- **Name:** Prosper
- **Purpose:** Personal finance and expense tracking.
- **Tech Stack:** Next.js 14 (App Router), TypeScript, Prisma (MySQL), Tailwind CSS, Docker.
- **Deployment:** Docker-based, supports self-hosting, Terraform for GCP.

## Core Features
1.  **Expense Tracking:**
    - Detailed transaction logging with timestamps, descriptions, and amounts.
    - Categorization with support for unlimited subcategories.
    - Tagging system for flexible grouping.
    - Support for tracking refunds (linked transactions) to calculate actual spending.
    - Joint accounts support (tracking personal value vs. total balance).

2.  **Multi-Currency & Wealth Management:**
    - Seamless support for multiple currencies.
    - Automatic exchange rate updates via API integration.
    - Total wealth calculation across all assets.
    - Stock and ETF tracking with automatic quote updates.

3.  **Open Banking Integration:**
    - Integration with TrueLayer, Nordigen (GoCardless), and Starling Bank.
    - Automated transaction importing.

4.  **Trips:**
    - Dedicated tracking for trips/vacations.
    - Associate transactions with specific trips.

5.  **Data Visualization & Reporting:**
    - Interactive charts using ECharts.
    - Detailed statistics and breakdown of expenses.
    - Customizable display settings (e.g., preferred currency, exclude categories).

## Architecture & Best Practices
- **Codebase:** Follow Next.js App Router conventions. Use `src/app` for routes, `src/components` for UI, `src/lib` for utilities, `src/actions` for server actions.
- **Type Safety:** Strict TypeScript usage is mandatory. Use Zod for schema validation.
- **Database:** Use Prisma ORM. Schema is split into multiple files in `prisma/schema/`.
- **Styling:**
    - Use Tailwind CSS for styling.
    - Use `clsx` and `tailwind-merge` for class management.
    - Use Radix UI and Headless UI for accessible components.
- **State Management:** Use Server Actions for mutations. Use standard React hooks for local state.
- **Testing:**
    - Write unit tests using Jest. Ensure critical logic is covered.
    - **E2E Tests:** Place end-to-end tests in an `e2e` directory at the project root. Each feature's tests should be in a separate `.spec.ts` file using Playwright.
- **Clean Code:** Prioritize readability, maintainability, and modularity. Keep components small and focused. Avoid "magic numbers" and hardcoded strings.

## Guidelines for Generating Code
1.  **Context Aware:** Always consider the existing project structure and dependencies.
2.  **Type Safe:** Ensure all code is strictly typed. Avoid `any`.
3.  **Performance:** Be mindful of server-side rendering vs. client-side rendering trade-offs.
4.  **Security:** Validate inputs using Zod. Ensure authentication and authorization checks are in place.
5.  **UX:** Follow the existing design language (Tailwind classes, UI components).
