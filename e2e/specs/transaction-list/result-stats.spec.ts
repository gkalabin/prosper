import {expect, test} from '../../lib/fixtures/test-base';
import {TransactionListPage} from '../../pages/TransactionListPage';

test.describe('Transaction List Stats', () => {
  test('shows total of all transactions', async ({page, seed, loginAs}) => {
    const bundle = await seed.createUserWithTestData();
    await seed.newExpenseFromBundle(bundle, 'Starbucks', 100);
    await seed.newExpenseFromBundle(bundle, 'Starbucks', 200);
    await seed.newExpenseFromBundle(bundle, 'Nero', 50);
    await loginAs(bundle.user);
    const listPage = new TransactionListPage(page);
    await listPage.goto();
    await listPage.openStats();
    await listPage.expectTotalExpenseToBe('$350');
    await expect(listPage.incomeSection()).not.toBeVisible();
  });

  test('displays monthly totals', async ({page, seed, loginAs}) => {
    const bundle = await seed.createUserWithTestData();
    await seed.newExpenseFromBundle(bundle, 'Netflix', 15, '2025-10-08');
    await seed.newExpenseFromBundle(bundle, 'Netflix', 15, '2025-09-08');
    // 2025-08 is omitted on purpose.
    await seed.newExpenseFromBundle(bundle, 'Netflix', 15, '2025-07-08');
    await seed.newExpenseFromBundle(bundle, 'Spotify', 10, '2025-07-25');
    await seed.newExpenseFromBundle(bundle, 'Spotify', 10, '2025-06-25');
    await loginAs(bundle.user);
    const listPage = new TransactionListPage(page);
    await listPage.goto();
    await listPage.openStats();
    await listPage.expectMonthlyNetExpenseChartAmounts([10, 25, 0, 15, 15]);
  });

  test('percentiles', async ({page, seed, loginAs}) => {
    const bundle = await seed.createUserWithTestData();
    await seed.newExpenseFromBundle(bundle, 'Netflix', 30, '2025-12-25');
    await seed.newExpenseFromBundle(bundle, 'Netflix', 25, '2025-11-25');
    await seed.newExpenseFromBundle(bundle, 'Netflix', 20, '2025-10-25');
    await seed.newExpenseFromBundle(bundle, 'Netflix', 15, '2025-09-25');
    await seed.newExpenseFromBundle(bundle, 'Netflix', 10, '2025-08-25');
    await seed.newExpenseFromBundle(bundle, 'Netflix', 5, '2025-07-25');
    await seed.newExpenseFromBundle(bundle, 'Netflix', 1, '2025-06-25');
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
