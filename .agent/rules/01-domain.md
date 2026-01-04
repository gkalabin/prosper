---
trigger: always_on
---

## Domain & Feature Specifications

### 1. Authentication & Security

- **User Isolation:** All data (transactions, accounts, settings, categories) is
  strictly isolated by `userId`.
- **Session Management:** Handled via secure HTTP-only cookies and middleware.
- **Privacy:** "Hide Balances" mode allows users to obscure sensitive financial
  figures on the dashboard.

### 2. Financial Accounts

- **Account Types:**
  - **Bank Accounts:** Standard accounts (Checking, Savings, Credit).
  - **Investment Accounts:** Track Stocks or ETFs. These accounts use a specific
    "Unit" (e.g., AAPL shares) instead of a currency.
- **Multi-Currency:** Accounts and transactions support any currency code.
- **Archiving:** Accounts can be archived to hide them from the main lists
  without losing historical data.
- **External Mapping:** Internal accounts are explicitly mapped to external Open
  Banking accounts for data syncing.

### 3. Core Transaction Logic

- **Transaction Types:**
  - **Expense:** Money leaving the user's possession.
  - **Income:** Money entering the user's possession.
  - **Transfer:** Movement of funds between two internal accounts. Tracks
    distinct currencies/amounts for source and destination.
- **Attributes:**
  - **Categories:** Support unlimited nesting depth with custom ordering.
  - **Tags:** Many-to-many relationship for flexible grouping.
  - **Shared Expenses:** Tracks "Total Amount" vs. "Own Share" (e.g., for
    splitting bills with others).
  - **Metadata:** Vendor, Payer, Other Party, Description, Timestamp.
- **Transaction Linking:**
  - **Refunds:** Linked to an original expense to calculate "actual" spend.
  - **Debt Settling:** Links transactions to track debt repayment.

### 4. Open Banking Integration

- **Providers:** TrueLayer, Nordigen (GoCardless), Starling Bank.
- **Design Principle: "No Auto-Import"**
  - The app **never** automatically creates transactions in the ledger.
  - Open Banking data is fetched only to generate **Prototypes** (Suggestions).
  - Users must manually review, edit (if needed), and approve suggestions. This
    ensures high data quality ("No garbage").
- **Heuristic Transfer Detection:**
  - The system automatically detects potential transfers by matching a
    `Withdrawal` and a `Deposit` that:
    - Have the same absolute amount.
    - Occur within a close time window (typically < 2 hours).
  - These are presented as a single "Transfer" prototype to the user,
    simplifying the reconciliation process.
- **Data Integrity:** Declined transactions are automatically filtered out.

### 5. Analytics & Reporting

- **Dashboards:**
  - **Cashflow:** Inflow vs. Outflow analysis over time.
  - **Breakdowns:** Detailed expense and income categorization.
- **Currency Normalization:** All visualizations automatically convert amounts
  to the user's preferred "Display Currency" using historical exchange rates.
- **Exclusions:** Users can configure specific categories to be excluded from
  global statistics (e.g., business expenses).

### 6. Trips

- **Event Grouping:** Dedicated entity for tracking expenses related to a
  specific trip or event (defined by location and dates).
- **Reporting:** Transactions associated with a Trip ID allow for isolated
  budget tracking independent of standard monthly reporting.
