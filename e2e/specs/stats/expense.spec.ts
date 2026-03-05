import {subMonths} from 'date-fns';
import {test} from '../../lib/fixtures/test-base';
import {ExpenseStatsPage} from '../../pages/ExpenseStatsPage';

test.describe('Expense Stats', () => {
  test('displays monthly expense chart', async ({page, seed, loginAs}) => {
    const bundle = await seed.createUserWithTestData();
    const now = new Date();
    const addExpense = (amount: number, timestamp: Date) =>
      seed.expense('Starbucks', amount, {...bundle, timestamp});
    // This month - total expense is 200 (100+100)
    await addExpense(100, now);
    await addExpense(100, now);
    // Last month - total expense is 600 (200+200+200)
    await addExpense(200, subMonths(now, 1));
    await addExpense(200, subMonths(now, 1));
    await addExpense(200, subMonths(now, 1));
    // Two months ago - total expense is 300
    await addExpense(300, subMonths(now, 2));
    await loginAs(bundle.user);
    const expenseStatsPage = new ExpenseStatsPage(page);
    await expenseStatsPage.goto();
    await expenseStatsPage.selectDuration('Last 6 months');
    await expenseStatsPage.expectMonthlyChartVisible();
    await expenseStatsPage.expectMonthlyChartAmounts([0, 0, 0, 300, 600, 200]);
  });
});
