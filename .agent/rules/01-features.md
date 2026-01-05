---
trigger: always_on
---

## Features

Propser is a personal expense tracking app.

### Goals

- Provide a total amount of money the user has.
- Give insight into where money is spend on and where it is coming from.
- Show the user total money over time to allow tracking wealth building and its
  pace.

### Entities

- **User** is a core entity which belongs to an app user. There is no data
  sharing between users in the app and all of the data is isolated to a user and
  has userId associated with it.
- **Bank** is an entity which the user needs to create in order to use the app.
  It represents a financial institution which holds user Bank Accounts.
  - Example: "HSBC".
- **Bank Account** represents an account user can spend monies from or receive
  to.
  - Bank Account has a parent bank associated with it.
  - Bank Account has a unit (currency or stock/ETF) associated with it. All
    transactons affecting this account are in this unit.
  - Shared bank accounts mean that the account balance is shared with someone
    else, so the user owns only half of the balance.
  - Accounts can be archived to hide them from the main lists without losing
    historical data.
  - Example: "Credit Card" account in HSBC bank.
- **Category** is used for tracking where money is spend and earned.
  - All transactions have exactly one category associated with it.
  - Categories can be nested to allow precise tracking without losing the big
    picture.
  - Example: category named "Delivery" nested under "Groceries" top category.
- **Tag** is a way to group transactions in an arbitrary way.
  - Tags are identified by a string name. The name is case insensitive, but the
    original case is preserved when a tag is created.
  - A transaction can have any number of tags, including zero.
  - Example: "ChristmasPresents2026"
- **Trip** is an entity used to represent an event or a trip. Used for vacation
  cost insights.
  - A transaction can be assigned to a single trip only.
  - Trip has a start and an end date, but transactions of any date can be
    assigned with it. This is because you can book a hotel before staying there.
  - Example: "ParisNov26"

### Transaction kinds

#### Common transaction properties

- Timestamp: when transaction happened. Settlement timestamp is not used to
  avoid unnecessary complexity.
- Category: for tracking where money is spent/earned. Example: Eating out >
  Coffeeshops.
- Note: optional text to add more details to the transaction. Example: "Coffee
  for me and Dane"
- Tags: optional list of tags for grouping transactions. Example:
  [BachelorParty, FriendsOuting]

#### Expense

User spent money on something.

Example: I paid £10 for coffee in Starbucks for myself and my roommate Dane, he
owes me £5 and is expected to eventually pay back.

Has following additional attributes

- Vendor: where money was spent. Example: Starbucks
- Account: where the money was spent from. Example: "HSBC: Credit Card"
- Amount: how much was spent. Example: £10.
- Own share amount: how much was spend by the user. Example: £5 own coffee and
  £5 coffee for Dane. Dane ows £5 back and is expected to repay some day.
- Companion: who ows the money for this transaction. Example: Dane.
- Trip: optional string name of a trip. Example: AmsterdamDaneBachelorParty2026.
- Refunds: a separate Income transaction can link to this expense as a refund.
  This reduces the spend of this transaction by the income amount.
- Debt settling: an optional link to an external (paid by other person) debt
  transaction to indicate the user's debt repayment.

#### Income

User received money.

Example: Received £2000 salary from Goldman Sachs (my employer).

Has following additional attributes

- Payer: who paid the money. Example: Goldman Sachs.
- Account: where the money was deposited. Example: "HSBC: Current Account"
- Amount: how much was received. Example: £2000.
- Refund transaction: a link to a separate Expense transaction. This income
  transaction is a refund for the expense and reduces the spend of the expense
  by the income amount.

#### Transfer

User moved money between their own accounts.

Example: Transfer £500 from Savings to Current account.

Has following additional attributes

- Sent from: where money is taken from. Example: "HSBC: Savings"
- Received to: where money is deposited. Example: "HSBC: Current Account"
- Amount: how much was taken from source. Example: £500.
- Received amount: optional amount received in destination. Used if accounts
  have different units (e.g. GBP to USD, or Cash to Stock).

#### Expenses paid by others (Third-party)

User spent money but another person paid for it. The user now owes money to that
person.

Example: Dane paid £20 for my dinner at Nando's. I owe Dane £20.

Has following additional attributes

- Payer: who paid for the expense. Example: Dane.
- Vendor: where money was spent. Example: Nando's.
- Amount: how much the user spent (and now owes). Example: £20.
- Debt settling: a link to an Expense transaction (repayment) to indicate the
  debt has been settled.

### Features

#### Accounts overview

- Display list of banks and their corresponding bank accounts with their actual
  balances.
  - Bank accounts might be either denominated in a currency or a stock/ETF
    ticker.
- Display the total sum across all the accounts converted to the common
  currency.
  - Conversion covers accounts denominated in stock/ETFs.
- Display the balance and a list of transactions for a given account.
  - The total includes values in the account unit (might be stock/ETF), trading
    currency (only for non-currency accounts) and display currency selected by
    the user.
- User can configure display currency to show totals in that currency.
- The application syncs the actual exchange rates via an API.
  - Pulling the most recent exchange rates happens in the background to avoid
    latency penalty during page rendering.
  - In case of a background process not working, the app requests fresh
    quotes/rates if they are stale.

#### Transactions list

- Display a list of transactions.
  - List can be filtered by keywords. Example: "Starbucks" shows all the
    transactions matching the keyword.
  - Advanced filtering supported. Example: "amount>5000" lists all transactions
    with amount higher than 1000.
- Summary statistics are available for the transactions matching the filter.
  Examples include
  - Total amount spent/received for the transactions.
  - Monthly/yearly spend.
  - Vendors and their frequency/amount.
  - Similar stats for income transactions and transfers.

#### Stats: common features

- All visualizations automatically convert amounts to the user's preferred
  "Display Currency" using historical exchange rates.
- Allows a filter to exclude certain transactions (e.g. excluding Intra-family
  moves)

#### Stats: expense/income/cashflow

- Shows charts for various statistics using appropriate chart (bar, line, pie,
  etc). Examples include
- Monthly/yearly amount. Uses appropriate granularity or displays both.
- Running average to even out outlier months (e.g. holidays happening in
  summer).
- Most frequent vendors by frequency and amount.
- Allows filtering on timeline, e.g. last 6 months, year, all history

#### Stats: monthly/quarterly/yearly

- Summary for the selected period. Ability to change the period easily.
- Total spent, including gross spend (includes all parties) and own share. Same
  for total received.
- Most frequent and most spent/received vendors.
- Transactions in the period with ability to sort by amount and timestamp.

#### Open banking integration

- Open banking connection might be used to link an open banking account with an
  internal bank account entity in the app.
- No transactions are auto-imported to reduce risk of introducing garbage data.
- Open banking transactions are shown as "Suggestions", clicking one pre-fills
  new transaction form with the data from the open banking transaction.

#### Trips

- Show a list of trips with a total spent in a given trip.
- Detailed page view for a given trip. Displays the list of transactions, stats
  and charts. Examples include
  - Total amount spent in the trip, including both gross expense and own share.
  - Vendors by count and amount.
  - List of transactions sortable by amount and date.
