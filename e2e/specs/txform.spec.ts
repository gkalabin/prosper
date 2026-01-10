import {expect, test} from '../lib/fixtures/test-base';
import {AddTransactionPage} from '../pages/AddTransactionPage';
import {ExpenseStatsPage} from '../pages/ExpenseStatsPage';
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

    test('creates an expense with split (shared expense)', async ({
      page,
      seed,
    }) => {
      // Given: User with bank, account, and category
      const user = await seed.createUser();
      const bank = await seed.createBank(user.id);
      await seed.createAccount(user.id, bank.id, {
        initialBalanceCents: 50000, // $500
      });
      const category = await seed.createCategory(user.id);
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(user.login, user.rawPassword);
      // When: Create a split expense where total is $100, user's share is $60
      const addTxPage = new AddTransactionPage(page);
      await addTxPage.goto();
      await addTxPage.addSplitExpense({
        amount: 100,
        ownShareAmount: 60,
        companion: 'Alice',
        datetime: new Date(),
        vendor: "Wendy's",
        category: category.name,
      });

      // Then: Account balance should be reduced by the whole expense ($500 - $100 = $400)
      const overviewPage = new OverviewPage(page);
      await overviewPage.goto();
      await overviewPage.expectBalance('$400');
      // And: Stats page should show expense as own share ($60)
      const statsPage = new ExpenseStatsPage(page);
      await statsPage.goto();
      await statsPage.selectDuration('Last 6 months');
      // Chart shows 6 months: previous 5 months with no expenses, current month with $60 own share
      await statsPage.expectMonthlyChartAmounts([0, 0, 0, 0, 0, 60]);
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

    test('edits an existing expense', async ({page, seed}) => {
      // Given: User with bank, account, category, and existing expense
      const user = await seed.createUser();
      const bank = await seed.createBank(user.id);
      const account = await seed.createAccount(user.id, bank.id);
      const category = await seed.createCategory(user.id);
      await seed.createExpense(user.id, account.id, category.id, 30, 'Nero');
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(user.login, user.rawPassword);
      // When: editing expense
      const listPage = new TransactionListPage(page);
      await listPage.goto();
      await listPage.clickEditTransaction('Nero');
      // TODO: refactor class name, here we are using update transaction dialog
      // It mostly the same as add transaction (page and dialog)
      const addTxPage = new AddTransactionPage(page);
      await addTxPage.editExpense({
        amount: 45.5,
        vendor: 'Costa',
      });
      // Refresh the page to see updated data
      await listPage.goto();
      // Then: updated values are displayed
      await expect(listPage.getTransactionListItem('Costa')).toBeVisible();
      await expect(listPage.getTransactionListItem('$45.5')).toBeVisible();
      await expect(listPage.getTransactionListItem('Nero')).not.toBeVisible();
    });
  });

  test.describe('Income Transactions', () => {
    test('creates an income transaction', async ({page, seed}) => {
      // Given
      const user = await seed.createUser();
      const bank = await seed.createBank(user.id);
      await seed.createAccount(user.id, bank.id, {
        initialBalanceCents: 50000, // $500 initial balance
      });
      const category = await seed.createCategory(user.id);
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(user.login, user.rawPassword);
      // When
      const addTxPage = new AddTransactionPage(page);
      await addTxPage.goto();
      await addTxPage.addIncome({
        amount: 1500,
        datetime: new Date(),
        payer: 'Acme Corp',
        category: category.name,
      });
      // Then
      const listPage = new TransactionListPage(page);
      await listPage.goto();
      await expect(listPage.getTransactionListItem('Acme Corp')).toBeVisible();
      await expect(listPage.getTransactionListItem('$1,500')).toBeVisible();
      // Verify account balance is updated on overview to $2000 - $500 initial balance and $1500 income
      const overviewPage = new OverviewPage(page);
      await overviewPage.goto();
      await overviewPage.expectBalance('$2,000');
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
