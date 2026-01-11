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
  });
});
