---
trigger: always_on
---

## Prosper: Personal Expense Tracking App

**Goals:** Track total wealth, spending sources, income sources, and wealth
growth over time.

## Entities

| Entity           | Description                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------------- |
| **User**         | Core entity. All data is isolated per user via `userId`.                                                  |
| **Bank**         | Financial institution holding accounts. Example: "HSBC"                                                   |
| **Bank Account** | Account for spending/receiving. Has parent Bank, unit (currency/stock), optional sharing, can be archived |
| **Category**     | Classifies transactions. Supports nesting. Example: "Groceries > Delivery"                                |
| **Tag**          | Arbitrary transaction grouping. Case-insensitive name. Zero or more per transaction.                      |
| **Trip**         | Event/vacation for cost tracking. Has date range; transactions can be of any date.                        |

## Transaction Types

### Common Properties

All transactions have: `timestamp`, `category`, `note` (optional), `tags`
(optional list).

### Expense

User spent money.

| Field          | Description                                                     |
| -------------- | --------------------------------------------------------------- |
| vendor         | Where money was spent                                           |
| account        | Source account                                                  |
| amount         | Total spent                                                     |
| ownShareAmount | User's portion (for split expenses)                             |
| companion      | Who owes the remaining amount                                   |
| trip           | Optional trip association                                       |
| refunds        | Linked Income transactions reducing effective spend             |
| debtSettling   | Link to third-party expense being repaid by this user's expense |

### Income

User received money.

| Field             | Description                              |
| ----------------- | ---------------------------------------- |
| payer             | Source of income                         |
| account           | Destination account                      |
| amount            | Amount received                          |
| refundTransaction | Link to Expense this income is refunding |

### Transfer

User moved money between own accounts.

| Field          | Description                                                     |
| -------------- | --------------------------------------------------------------- |
| sentFrom       | Source account                                                  |
| receivedTo     | Destination account                                             |
| amount         | Amount taken from source                                        |
| receivedAmount | Optional: amount in destination (for currency/stock conversion) |

### Third-Party Expense

User incurred expense paid by another person (creates debt).

| Field        | Description                                  |
| ------------ | -------------------------------------------- |
| payer        | Who paid                                     |
| vendor       | Where money was spent                        |
| amount       | Amount user owes                             |
| debtSettling | Link to user's Expense that repays this debt |

## Features

### Accounts Overview

- Bank/account list with balances (currency or stock/ETF)
- Total across all accounts converted to display currency
- Per-account transaction list with multi-currency totals
- Configurable display currency
- Background exchange rate sync via API (fallback to on-demand if stale)

### Transactions List

- Keyword filtering (e.g., "Starbucks")
- Advanced filters (e.g., `amount>5000`, `date<=2025-12-31`, `vendor:Starbucks`)
- Summary stats: total spent/received, monthly/yearly, vendor frequency

### Statistics

**Common:** All amounts converted to display currency using historical rates.
Excludable transaction filters available.

**Expense/Income/Cashflow:**

- Charts: monthly/yearly amounts, running averages, vendor rankings
- Timeline filters: 6 months, 1 year, all history

**Periodic (Monthly/Quarterly/Yearly):**

- Period totals: gross spend, own share, income
- Top vendors by frequency and amount
- Sortable transaction list

### Open Banking

- Links external open banking accounts to internal Bank Account entities
- No auto-import; transactions shown as "Suggestions" to pre-fill forms

### Trips

- Trip list with total spend
- Trip detail: transactions, gross/own share totals, vendor stats, sortable list
