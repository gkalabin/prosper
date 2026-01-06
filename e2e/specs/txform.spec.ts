import {expect, test} from '../lib/fixtures/test-base';
import {AddTransactionPage} from '../pages/AddTransactionPage';
import {LoginPage} from '../pages/LoginPage';
import {OverviewPage} from '../pages/OverviewPage';
import {TransactionListPage} from '../pages/TransactionListPage';

test.describe('Create Transactions', () => {
  test.describe('Expense Transactions', () => {
    test('creates a simple expense', async ({page, seed}) => {
      // Given
      const user = await seed.createUser();
      const bank = await seed.createBank(user.id, {name: 'HSBC'});
      await seed.createAccount(user.id, bank.id, {
        name: 'Current',
        // Initial balance $100
        initialBalanceCents: 10000,
      });
      const category = await seed.createCategory(user.id, {name: 'Groceries'});
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(user.login, user.rawPassword);
      // When
      const addTxPage = new AddTransactionPage(page);
      await addTxPage.goto();
      await addTxPage.addExpense({
        amount: 42.2,
        datetime: new Date(),
        vendor: 'Whole Foods',
        category: category.name,
      });
      // Then
      const transactionListPage = new TransactionListPage(page);
      await transactionListPage.goto();
      await expect(
        transactionListPage.getTransactionListItem('Whole Foods')
      ).toBeVisible();
      await expect(
        transactionListPage.getTransactionListItem('$42.2')
      ).toBeVisible();
      // Verify account balance is updated on overview
      const overviewPage = new OverviewPage(page);
      await overviewPage.goto();
      // Total balance is rounded on the overview page.
      await overviewPage.expectBalance('$58');
    });

    test('creates an expense with split (shared expense)', async () => {
      // TODO: Create user with bank, account, and category via seed
      // TODO: Log in
      // TODO: Navigate to add transaction page
      // TODO: Select expense tab
      // TODO: Fill amount and set own share amount
      // TODO: Set companion who owes the remaining amount
      // TODO: Submit form
      // TODO: Verify expense shows both total and own share
    });

    test('creates an expense with optional note', async () => {
      // TODO: Create user with bank, account, and category via seed
      // TODO: Log in
      // TODO: Navigate to add transaction page
      // TODO: Fill expense details including a note
      // TODO: Submit form
      // TODO: Verify note is saved and displayed
    });

    test('creates an expense with tags', async () => {
      // TODO: Create user with bank, account, and category via seed
      // TODO: Log in
      // TODO: Navigate to add transaction page
      // TODO: Fill expense details
      // TODO: Add one or more tags
      // TODO: Submit form
      // TODO: Verify tags are associated with the transaction
    });

    test('creates an expense associated with a trip', async () => {
      // TODO: Create user with bank, account, category, and trip via seed
      // TODO: Log in
      // TODO: Navigate to add transaction page
      // TODO: Fill expense details
      // TODO: Select the trip
      // TODO: Submit form
      // TODO: Verify expense appears on the trip page
    });

    test('edits an existing expense', async () => {
      // TODO: Create user with an existing expense via seed
      // TODO: Log in
      // TODO: Navigate to transaction list
      // TODO: Click on the expense to edit
      // TODO: Change amount and vendor
      // TODO: Save changes
      // TODO: Verify updated values are displayed
    });
  });

  test.describe('Income Transactions', () => {
    test('creates an income transaction', async () => {
      // TODO: Create user with bank, account, and category via seed
      // TODO: Log in
      // TODO: Navigate to add transaction page
      // TODO: Select income tab
      // TODO: Fill amount, payer, category, timestamp
      // TODO: Submit form
      // TODO: Verify income appears in transaction list
      // TODO: Verify account balance is updated
    });

    test('links income as a refund to an expense', async () => {
      // TODO: Create user with bank, account, category, and expense via seed
      // TODO: Log in
      // TODO: Navigate to add transaction page
      // TODO: Select income tab
      // TODO: Fill income details
      // TODO: Link to the existing expense as a refund
      // TODO: Submit form
      // TODO: Verify refund link is established
      // TODO: Verify expense shows reduced effective spend
    });

    test('edits an existing income', async () => {
      // TODO: Create user with an existing income via seed
      // TODO: Log in
      // TODO: Navigate to transaction list
      // TODO: Click on the income to edit
      // TODO: Change amount
      // TODO: Save changes
      // TODO: Verify updated values are displayed
    });
  });

  test.describe('Transfer Transactions', () => {
    test('creates a transfer between accounts in same currency', async () => {
      // TODO: Create user with bank with two accounts in same currency via seed
      // TODO: Log in
      // TODO: Navigate to add transaction page
      // TODO: Select transfer tab
      // TODO: Select source and destination accounts
      // TODO: Fill amount
      // TODO: Submit form
      // TODO: Verify transfer appears in transaction list
      // TODO: Verify source account balance decreased
      // TODO: Verify destination account balance increased
    });

    test('creates a transfer with currency conversion', async () => {
      // TODO: Create user with accounts in different currencies via seed
      // TODO: Log in
      // TODO: Navigate to add transaction page
      // TODO: Select transfer tab
      // TODO: Select source and destination accounts
      // TODO: Fill sent amount and received amount (different due to exchange)
      // TODO: Submit form
      // TODO: Verify both amounts are recorded correctly
    });

    test('edits an existing transfer', async () => {
      // TODO: Create user with an existing transfer via seed
      // TODO: Log in
      // TODO: Edit the transfer
      // TODO: Change amount
      // TODO: Save changes
      // TODO: Verify balances are recalculated
    });
  });

  test.describe('Third-Party Expense Transactions', () => {
    test('creates a third-party expense (debt)', async () => {
      // TODO: Create user with category via seed
      // TODO: Log in
      // TODO: Navigate to add transaction page
      // TODO: Select third-party expense tab
      // TODO: Fill payer, vendor, amount owed, category
      // TODO: Submit form
      // TODO: Verify third-party expense appears in transaction list
    });

    test('links expense to repay a third-party expense', async () => {
      // TODO: Create user with a third-party expense via seed
      // TODO: Log in
      // TODO: Navigate to add transaction page
      // TODO: Create an expense
      // TODO: Link it as debt settling for the third-party expense
      // TODO: Submit form
      // TODO: Verify debt settling link is established
    });

    test('edits a third-party expense', async () => {
      // TODO: Create user with a third-party expense via seed
      // TODO: Log in
      // TODO: Edit the third-party expense details
      // TODO: Save changes
      // TODO: Verify updates are displayed
    });
  });
});
