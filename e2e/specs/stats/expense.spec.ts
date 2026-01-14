import {subMonths} from 'date-fns';
import {test} from '../../lib/fixtures/test-base';
import {ExpenseStatsPage} from '../../pages/ExpenseStatsPage';

test.describe('Expense Stats', () => {
  test('displays monthly expense chart', async ({page, seed, loginAs}) => {
    // Given: user with expenses across multiple months
    const {user, account, category} = await seed.createUserWithTestData();
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
    await loginAs(user);
    // When: navigating to expense statistics page
    const expenseStatsPage = new ExpenseStatsPage(page);
    await expenseStatsPage.goto();
    // Then: page loads and monthly chart shows total expenses by month
    await expenseStatsPage.selectDuration('Last 6 months');
    await expenseStatsPage.expectMonthlyChartVisible();
    await expenseStatsPage.expectMonthlyChartAmounts([0, 0, 0, 300, 600, 200]);
  });

  test('displays yearly expense chart', async ({page, seed, loginAs}) => {
    // Given: user with expenses across multiple years
    const {user, account, category} = await seed.createUserWithTestData();
    const thisYear = new Date();
    const lastYear = new Date(thisYear.getFullYear() - 1, 6, 15);
    const twoYearsAgo = new Date(thisYear.getFullYear() - 2, 3, 10);
    const addExpense = (amount: number, timestamp: Date) =>
      seed.createExpense(user.id, account.id, category.id, amount, 'Amazon', {
        timestamp,
      });
    // This year - total expense is 500 (300+200)
    await addExpense(300, thisYear);
    await addExpense(200, thisYear);
    // Last year - total expense is 1000 (400+600)
    await addExpense(400, lastYear);
    await addExpense(600, lastYear);
    // Two years ago - total expense is 250
    await addExpense(250, twoYearsAgo);
    await loginAs(user);
    // When: navigating to expense statistics page
    const expenseStatsPage = new ExpenseStatsPage(page);
    await expenseStatsPage.goto();
    // Then: page loads and yearly chart shows total expenses by year
    await expenseStatsPage.selectDuration('All time');
    await expenseStatsPage.expectYearlyChartVisible();
    await expenseStatsPage.expectYearlyChartAmounts([250, 1000, 500]);
  });

  test('excludes categories from stats when configured', async ({
    page,
    seed,
    loginAs,
  }) => {
    // Given: user with two categories (Groceries, Transfers)
    const user = await seed.createUser();
    const bank = await seed.createBank(user.id, {name: 'Chase'});
    const account = await seed.createAccount(user.id, bank.id, {
      name: 'Checking',
    });
    const groceries = await seed.createCategory(user.id, {name: 'Groceries'});
    const transfers = await seed.createCategory(user.id, {name: 'Transfers'});
    // Create expenses: 400 in Groceries, 600 in Transfers
    const now = new Date();
    await seed.createExpense(
      user.id,
      account.id,
      groceries.id,
      400,
      'Whole Foods',
      {timestamp: now}
    );
    await seed.createExpense(
      user.id,
      account.id,
      transfers.id,
      600,
      'Wire Transfer',
      {timestamp: now}
    );
    // Configure Transfers category to be excluded from stats
    await seed.updateDisplaySettings(user.id, {
      excludeCategoryIdsInStats: String(transfers.id),
    });
    await loginAs(user);
    // When: navigating to expense statistics page
    const expenseStatsPage = new ExpenseStatsPage(page);
    await expenseStatsPage.goto();
    // Then: only Groceries expenses appear in charts (total 400)
    await expenseStatsPage.selectDuration('Last 6 months');
    await expenseStatsPage.expectMonthlyChartVisible();
    // The chart should show 0 for months without expenses and 400 for current month
    await expenseStatsPage.expectMonthlyChartAmounts([0, 0, 0, 0, 0, 400]);
  });
});
