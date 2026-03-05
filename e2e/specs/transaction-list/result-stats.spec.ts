import {expect, test} from '../../lib/fixtures/test-base';
import {TransactionListPage} from '../../pages/TransactionListPage';

test.describe('Transaction List Stats', () => {
  test('shows total of all transactions', async ({page, seed, loginAs}) => {
    const bundle = await seed.createUserWithTestData();
    await seed.expense('Starbucks', 100, bundle);
    await seed.expense('Starbucks', 200, bundle);
    await seed.expense('Nero', 50, bundle);
    await loginAs(bundle.user);
    const listPage = new TransactionListPage(page);
    await listPage.goto();
    await listPage.openStats();
    await listPage.expectTotalExpenseToBe('$350');
    await expect(listPage.incomeSection()).not.toBeVisible();
  });

  test('displays monthly totals', async ({page, seed, loginAs}) => {
    const bundle = await seed.createUserWithTestData();
    await seed.expense('Netflix', 15, {...bundle, timestamp: '2025-10-08'});
    await seed.expense('Netflix', 15, {...bundle, timestamp: '2025-09-08'});
    // 2025-08 is omitted on purpose.
    await seed.expense('Netflix', 15, {...bundle, timestamp: '2025-07-08'});
    await seed.expense('Spotify', 10, {...bundle, timestamp: '2025-07-25'});
    await seed.expense('Spotify', 10, {...bundle, timestamp: '2025-06-25'});
    await loginAs(bundle.user);
    const listPage = new TransactionListPage(page);
    await listPage.goto();
    await listPage.openStats();
    await listPage.expectMonthlyNetExpenseChartAmounts([10, 25, 0, 15, 15]);
  });

  test('percentiles', async ({page, seed, loginAs}) => {
    const bundle = await seed.createUserWithTestData();
    await seed.expense('Netflix', 30, {...bundle, timestamp: '2025-12-25'});
    await seed.expense('Netflix', 25, {...bundle, timestamp: '2025-11-25'});
    await seed.expense('Netflix', 20, {...bundle, timestamp: '2025-10-25'});
    await seed.expense('Netflix', 15, {...bundle, timestamp: '2025-09-25'});
    await seed.expense('Netflix', 10, {...bundle, timestamp: '2025-08-25'});
    await seed.expense('Netflix', 5, {...bundle, timestamp: '2025-07-25'});
    await seed.expense('Netflix', 1, {...bundle, timestamp: '2025-06-25'});
    await loginAs(bundle.user);
    const listPage = new TransactionListPage(page);
    await listPage.goto();
    await listPage.openStats();
    await listPage.expectExpensesNetMonthlyPercentiles({
      p25: '$5',
      p50: '$15',
      p75: '$25',
      max: '$30',
    });
  });
});
