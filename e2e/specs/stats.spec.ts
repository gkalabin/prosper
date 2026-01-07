import {subMonths} from 'date-fns';
import {test} from '../lib/fixtures/test-base';
import {ExpenseStatsPage} from '../pages/ExpenseStatsPage';
import {LoginPage} from '../pages/LoginPage';

test.describe('Statistics', () => {
  test.describe('Expense Statistics', () => {
    test('displays monthly expense chart', async ({page, seed}) => {
      // Given: user with expenses across multiple months
      const user = await seed.createUser();
      const bank = await seed.createBank(user.id);
      const account = await seed.createAccount(user.id, bank.id);
      const category = await seed.createCategory(user.id);
      const now = new Date();
      const addExpense = (amount: number, timestamp: Date) =>
        seed.createExpense(
          user.id,
          account.id,
          category.id,
          amount,
          'Starbucks',
          {timestamp}
        );
      // This month - total expense is 200 (100+100)
      await addExpense(100, now);
      await addExpense(100, now);
      // Last month - total expense is 600 (200+200+200)
      await addExpense(200, subMonths(now, 1));
      await addExpense(200, subMonths(now, 1));
      await addExpense(200, subMonths(now, 1));
      // Two months ago - total expense is 300
      await addExpense(300, subMonths(now, 2));
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(user.login, user.rawPassword);
      // When: navigating to expense statistics page
      const expenseStatsPage = new ExpenseStatsPage(page);
      await expenseStatsPage.goto();
      // Then: page loads and monthly chart shows total expenses by month
      await expenseStatsPage.selectDuration('Last 6 months');
      await expenseStatsPage.expectMonthlyChartVisible();
      await expenseStatsPage.expectMonthlyChartAmounts([
        0, 0, 0, 300, 600, 200,
      ]);
    });

    test('displays yearly expense totals', async () => {
      // TODO: Create user with expenses across multiple years via seed
      // TODO: Log in
      // TODO: Navigate to expense statistics page
      // TODO: Switch to yearly view
      // TODO: Verify yearly totals are displayed
    });

    test('displays vendor rankings by spend', async () => {
      // TODO: Create user with expenses at various vendors via seed
      // TODO: Log in
      // TODO: Navigate to expense statistics page
      // TODO: Verify vendor ranking is displayed
      // TODO: Verify vendors are sorted by total spend
    });

    test('applies timeline filter (6 months, 1 year, all)', async () => {
      // TODO: Create user with expenses spanning multiple years via seed
      // TODO: Log in
      // TODO: Navigate to expense statistics page
      // TODO: Select 6 months filter
      // TODO: Verify only recent 6 months data is shown
      // TODO: Select 1 year filter
      // TODO: Verify only last year data is shown
      // TODO: Select all time
      // TODO: Verify all data is shown
    });
  });

  test.describe('Income Statistics', () => {
    test('displays monthly income chart', async () => {
      // TODO: Create user with income transactions via seed
      // TODO: Log in
      // TODO: Navigate to income statistics page
      // TODO: Verify monthly income chart is rendered
    });

    test('displays payer rankings', async () => {
      // TODO: Create user with income from various payers via seed
      // TODO: Log in
      // TODO: Navigate to income statistics page
      // TODO: Verify payer ranking is displayed
    });
  });

  test.describe('Cashflow Statistics', () => {
    test('displays cashflow chart showing income vs expense', async () => {
      // TODO: Create user with both income and expenses via seed
      // TODO: Log in
      // TODO: Navigate to cashflow statistics page
      // TODO: Verify cashflow chart shows both income and expense
      // TODO: Verify net cashflow is calculated correctly
    });
  });

  test.describe('Periodic Statistics', () => {
    test('displays monthly period breakdown', async () => {
      // TODO: Create user with transactions via seed
      // TODO: Log in
      // TODO: Navigate to monthly statistics page
      // TODO: Verify monthly totals: gross spend, own share, income
      // TODO: Verify top vendors by frequency and amount
    });

    test('displays quarterly period breakdown', async () => {
      // TODO: Create user with transactions via seed
      // TODO: Log in
      // TODO: Navigate to quarterly statistics page
      // TODO: Verify quarterly totals are displayed
    });

    test('displays yearly period breakdown', async () => {
      // TODO: Create user with transactions via seed
      // TODO: Log in
      // TODO: Navigate to yearly statistics page
      // TODO: Verify yearly totals are displayed
    });

    test('sorts transactions within a period', async () => {
      // TODO: Create user with transactions via seed
      // TODO: Log in
      // TODO: Navigate to a periodic statistics page
      // TODO: Verify transaction list is sortable
      // TODO: Change sort order
      // TODO: Verify list order changes accordingly
    });
  });

  test.describe('Statistics Filters', () => {
    test('excludes selected categories from statistics', async () => {
      // TODO: Create user with transactions in multiple categories via seed
      // TODO: Log in
      // TODO: Navigate to statistics page
      // TODO: Open exclude categories filter
      // TODO: Select categories to exclude
      // TODO: Verify excluded category transactions are not in totals
    });
  });
});
