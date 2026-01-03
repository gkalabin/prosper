---
trigger: always_on
---

## Domain & Feature Specifications

### 1. Expense Tracking Logic

- **Transactions:** Must include timestamp, description, amount, and category.
- **Categories:** Support unlimited nesting depth.
- **Tags:** Grouping mechanism; transactions can have multiple tags.
- **Refunds:** Handled natively by linking a refund transaction to an expense
  transaction (calculates "actual" spend).
- **Shared Expenses:** Tracks total paid vs. individual share (e.g., split with
  roommates).
- **Joint Accounts:** Distinction between "Personal Value" vs. "Total Balance".
- **Transfers:** Tracks movement between accounts, preserving distinct
  currencies for "sent" vs. "received".

### 2. Multi-Currency & Assets

- **Unit System:** Every account has a specific unit (Currency, Stock, ETF).
- **Transactions:** Always recorded in the account's native unit.
- **Updates:** Automatic API integration for exchange rates and stock quotes.

### 3. Open Banking

- **Providers:** TrueLayer, Nordigen (GoCardless), Starling Bank.
- **Data Integrity Rule:** Open banking data is shown as _suggestions_ only.
- **No Auto-Import:** The app NEVER automatically imports transactions to
  prevent "garbage" data. User verification is mandatory.

### 4. Trips

- Dedicated entity for vacations/trips.
- Transactions can be associated with a Trip ID for separate reporting.

### 5. Reporting

- Visualizations must support currency conversion settings and category
  exclusions.
