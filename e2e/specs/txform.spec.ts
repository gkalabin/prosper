import {expect, test} from '../lib/fixtures/test-base';
import {ExpenseStatsPage} from '../pages/ExpenseStatsPage';
import {LoginPage} from '../pages/LoginPage';
import {NewTransactionPage} from '../pages/NewTransactionPage';
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
      const addTxPage = new NewTransactionPage(page);
      await addTxPage.goto();
      await addTxPage.form.addExpense({
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
      const addTxPage = new NewTransactionPage(page);
      await addTxPage.goto();
      await addTxPage.form.addSplitExpense({
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
      const form = await listPage.openEditForm('Nero');
      await form.editExpense({
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
      const addTxPage = new NewTransactionPage(page);
      await addTxPage.goto();
      await addTxPage.form.addIncome({
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
  });
});
