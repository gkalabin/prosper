# How Transactions Are Represented in the New Double-Entry Schema

Below is a guide showing how to record various real-world financial events in our double-entry schema. We have a single **[System] Expense** account (type=EXPENSE) for all expenses and a single **[System] Income** account (type=INCOME) for all incomes. Bank/cash accounts are type=ASSET. Amounts are stored as integer cents (`debitCents` or `creditCents`) in the account’s currency.

---

## 1. I Bought a Coffee in Starbucks

**Scenario**:

- You pay £3.00 for coffee from your **HSBC** account.

**Transaction** (`Transaction` record):

- `description`: `"Bought coffee at Starbucks"`
- `timestamp`: e.g., `2025-01-05T09:30:00.000Z`

**Transaction Lines** (`TransactionLine` records):

1. **Expense line**

   - `accountId`: [System] Expense (type=EXPENSE)
   - `debitCents`: 300 (i.e., £3.00)
   - `creditCents`: 0
   - `categoryId`: _(your “Coffee” or “Eating Out” category, if desired)_
   - `counterparty`: `"Starbucks"`

2. **Bank outflow line**
   - `accountId`: HSBC (type=ASSET)
   - `debitCents`: 0
   - `creditCents`: 300
   - `counterparty`: `"Starbucks"`

This ensures we debit an EXPENSE and credit the bank account.

---

## 2. I Was Paid Salary from Starbucks (My Employer)

**Scenario**:

- You receive £5,000 salary from an employer named “Starbucks” (unusual, but for illustration).

**Transaction**:

- `description`: `"Salary from Starbucks"`
- `timestamp`: e.g., `2025-01-31T09:00:00.000Z`

**Transaction Lines**:

1. **Income line**

   - `accountId`: [System] Income (type=INCOME)
   - `debitCents`: 0
   - `creditCents`: 500000 (i.e., £5,000.00)
   - `counterparty`: `"Starbucks"`

2. **Bank inflow line**
   - `accountId`: HSBC (type=ASSET)
   - `debitCents`: 500000
   - `creditCents`: 0
   - `counterparty`: `"Starbucks"`

Debiting an ASSET and crediting an INCOME captures incoming salary.

---

## 3. I Moved £500 from My HSBC Account to My Revolut GBP Account

**Scenario**:

- A simple internal transfer of £500 between two ASSET accounts.

**Transaction**:

- `description`: `"Transfer from HSBC to Revolut (GBP)"`
- `timestamp`: e.g., `2025-02-10T10:00:00.000Z`

**Transaction Lines**:

1. **Credit HSBC**

   - `accountId`: HSBC (type=ASSET)
   - `creditCents`: 50000
   - `debitCents`: 0

2. **Debit Revolut GBP**
   - `accountId`: Revolut GBP (type=ASSET)
   - `debitCents`: 50000
   - `creditCents`: 0

No expense or income involved—just moving money from one asset to another.

---

## 4. I Sold $1000 from My Revolut USD Account and Got £850 on My Revolut GBP Account

**Scenario**:

- Multi-currency exchange: You convert 1000 USD to 850 GBP within Revolut.

**Transaction**:

- `description`: `"Currency exchange: sold 1000 USD -> received 850 GBP"`
- `timestamp`: e.g., `2025-03-01T12:00:00.000Z`

**Transaction Lines**:

1. **Credit Revolut USD**

   - `accountId`: Revolut USD (type=ASSET, currencyCode=USD)
   - `creditCents`: 100000 (represents $1,000.00)
   - `debitCents`: 0

2. **Debit Revolut GBP**
   - `accountId`: Revolut GBP (type=ASSET, currencyCode=GBP)
   - `debitCents`: 85000 (represents £850.00)
   - `creditCents`: 0

Because it’s multi-currency, the numeric “sum” of debits/credits won’t match when converted, but each account tracks its own currency properly.

---

## 5. I Paid £3000 Monthly Mortgage Payment to HSBC, My Wife Jane Owes Me £1500, My Share Is £1500. Jane Pays Me Back £1500 One Day Before the Mortgage Payment

We’ll use **two transactions**: one for Jane’s reimbursement, another for the actual mortgage payment. Crucially, we track Jane’s share in the **Jane account** (type=ASSET or LIABILITY with `OWNED_BY_OTHER`) rather than lumping it into `[System] Expense`.

---

### 5A. Jane Pays Me £1500 the Day Before

**Transaction**

- `description`: `"Jane reimburses me for half the mortgage"`
- `timestamp`: e.g. `2025-03-31T09:00:00.000Z`

**Transaction Lines**

1. **Debit My Bank (HSBC)**

   - `accountId`: HSBC (type=ASSET)
   - `debitCents`: 150000 // £1500 inflow
   - `creditCents`: 0
   - `counterparty`: `"Jane"`

2. **Credit Jane**
   - `accountId`: Jane (type=ASSET or LIABILITY, ownership=OWNED_BY_OTHER)
   - `creditCents`: 150000
   - `debitCents`: 0
   - `counterparty`: `"Jane"`

_(If you do not track Jane’s own account, you could omit this line. However, this approach clearly shows that the £1500 came from Jane.)_

---

### 5B. Paying the £3000 Mortgage

You pay the entire £3000 from your HSBC account. Only £1500 is **your** expense; the other £1500 belongs to Jane. Instead of debiting `[System] Expense` for Jane’s half, you debit her **Jane account** to reflect that this portion is not your personal expense.

**Transaction**

- `description`: `"Monthly Mortgage Payment"`
- `timestamp`: e.g. `2025-04-01T09:00:00.000Z`

**Transaction Lines**

1. **Credit HSBC (Your Bank)**

   - `accountId`: HSBC (type=ASSET)
   - `creditCents`: 300000 // £3000 outflow
   - `debitCents`: 0
   - `counterparty`: `"HSBC Mortgage"`

2. **Debit [System] Expense** — _Your Portion (£1500)_

   - `accountId`: [System] Expense (type=EXPENSE)
   - `debitCents`: 150000
   - `creditCents`: 0
   - `categoryId`: _Your “Housing -> Mortgage” category_
   - `counterparty`: `"HSBC Mortgage"`

3. **Debit Jane** — _Spouse Portion (£1500)_
   - `accountId`: Jane (type=ASSET or LIABILITY, ownership=OWNED_BY_OTHER)
   - `debitCents`: 150000
   - `creditCents`: 0
   - `counterparty`: `"HSBC Mortgage"`

This approach shows:

- **Line #1**: You pay £3000 total from HSBC.
- **Line #2**: You record your £1500 as an expense.
- **Line #3**: The remaining £1500 is posted to Jane’s account, acknowledging it’s **her** portion, not yours.

By separating out the spouse portion into the **Jane** account, you ensure your personal expense reports only show **your** £1500. Meanwhile, Jane’s share is captured in her account (either as an asset or liability, depending on your preferred approach).

---

## 6. Jane Paid the Nanny Karen £500 for the Past Week. I Send Jane £250 Back for This Expense

Again, two transactions:

- Jane’s payment to the nanny (not directly your expense if Jane paid from her account).
- Your repayment to Jane for half.

### 6A. Jane Pays Nanny (Not Your Transaction)

If you **do** want to record it for family total tracking, you can put:

- `creditCents`: 50000 from Jane’s account
- `debitCents`: 50000 to [System] Expense with a “Childcare -> Nanny” category
- `counterparty`: `"Karen"`

If you **do not** track Jane’s personal outflows, you can skip this record in your own books.

### 6B. You Send Jane £250

**Transaction**:

- `description`: `"Reimburse Jane for nanny expense"`
- `timestamp`: e.g., `2025-05-02T10:00:00.000Z`

**Transaction Lines**:

1. **Credit your bank**

   - `accountId`: HSBC
   - `creditCents`: 25000

2. **Debit Jane**
   - `accountId`: Jane (type=ASSET or liability approach)
   - `debitCents`: 25000

No expense or income lines here, because from your perspective it’s purely settling a debt to Jane.

---

## 7. I Bought Clothes from Nike for £100, Some Clothes Didn’t Fit, I Returned Them and Got Paid £70 Back

### 7A. Initial Purchase: £100

**Transaction**:

- `description`: `"Nike clothes purchase"`
- `timestamp`: e.g., `2025-06-01T13:00:00.000Z`

**Transaction Lines**:

1. **Debit [System] Expense**
   - `accountId`: [System] Expense
   - `debitCents`: 10000
   - `creditCents`: 0
   - `categoryId`: _(e.g., “Clothing”)_
   - `counterparty`: `"Nike"`
2. **Credit your bank**
   - `accountId`: HSBC
   - `creditCents`: 10000
   - `debitCents`: 0
   - `counterparty`: `"Nike"`

### 7B. Partial Refund: £70

**Transaction**:

- `description`: `"Nike clothes partial refund"`
- `timestamp`: e.g., `2025-06-02T15:00:00.000Z`

**Transaction Lines**:

1. **Debit your bank** (money returned to you)
   - `accountId`: HSBC
   - `debitCents`: 7000
   - `creditCents`: 0
   - `counterparty`: `"Nike"`
2. **Credit [System] Expense**
   - `accountId`: [System] Expense
   - `creditCents`: 7000
   - `debitCents`: 0
   - `categoryId`: _(same “Clothing”)_
   - `counterparty`: `"Nike"`

You could also link these two transactions with `TransactionLink` of type `REFUND` if desired.

---

## 8. I Lent €4000 to Family Friend John and He Paid Me Back $4500 Three Weeks Later

### 8A. Lending €4000

**Transaction**:

- `description`: `"Loan to John"`
- `timestamp`: e.g., `2025-07-01T10:00:00.000Z`

**Transaction Lines**:

1. **Credit your bank** (assuming you pay from a Euro account)

   - `accountId`: e.g., “My EUR Account”
   - `creditCents`: 400000 (represents €4,000.00)

2. **Debit “Loan to John”**
   - If you maintain a separate asset account for tracking personal loans, do:
     - `accountId`: “John (Loan)” (type=ASSET)
     - `debitCents`: 400000

No income/expense here; it’s simply moving assets from your bank to the “loan” account.

### 8B. John Pays Back $4500

**Transaction**:

- `description`: `"Loan repayment from John"`
- `timestamp`: e.g., `2025-07-22T15:00:00.000Z`

**Transaction Lines**:

1. **Credit “John (Loan)”**
   - `accountId`: “John (Loan)”
   - `creditCents`: 400000 if you want to zero out the euro-based principal. Or you might do multi-currency logic.
2. **Debit your bank** in USD
   - `accountId`: e.g., “My USD Account”
   - `debitCents`: 450000 (represents $4,500.00)

There’s also a currency gain/loss if you want to track the difference. For instance, if you want the extra $500 recognized as income, you could add a line to [System] Income. But that depends on how you handle foreign exchange gains in personal finance.

---
