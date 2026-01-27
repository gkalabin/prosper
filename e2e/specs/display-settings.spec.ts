import {expect, test} from '../lib/fixtures/test-base';
import {DisplaySettingsPage} from '../pages/DisplaySettingsPage';
import {ExpenseStatsPage} from '../pages/ExpenseStatsPage';
import {OverviewPage} from '../pages/OverviewPage';

test.describe('Settings', () => {
  test('changes display currency', async ({page, seed, loginAs}) => {
    const {user} = await seed.createUserWithTestData({
      account: {
        initialBalanceCents: 100000,
        currencyCode: 'USD',
      },
    });
    await seed.createExchangeRate('USD', 'EUR', 0.92); // 1 USD = 0.92 EUR
    await seed.updateDisplaySettings(user.id, {displayCurrencyCode: 'USD'});
    await loginAs(user);
    // User has USD as display currency initially, verify it is used in overview.
    const overviewPage = new OverviewPage(page);
    await overviewPage.goto();
    await overviewPage.expectTotalBalance('$1,000');
    // Navigate to settings and change display currency to EUR
    const settingsPage = new DisplaySettingsPage(page);
    await settingsPage.goto();
    await settingsPage.selectDisplayCurrency('EUR');
    await settingsPage.save();
    // Verify overview shows amounts in EUR
    await overviewPage.goto();
    await overviewPage.expectTotalBalance('€ 920');
  });

  test('excludes categories from statistics', async ({page, seed, loginAs}) => {
    const {user, account} = await seed.createUserWithTestData();
    const gas = await seed.createCategory(user.id, {name: 'Gas'});
    const debt = await seed.createCategory(user.id, {name: 'Debts'});
    await seed.createExpense(user.id, account.id, gas.id, 300, 'BP');
    await seed.createExpense(user.id, account.id, debt.id, 700, 'Wife');
    await loginAs(user);
    // Exclude debts from stats.
    const settingsPage = new DisplaySettingsPage(page);
    await settingsPage.goto();
    await settingsPage.addExcludedCategory('Debts');
    await settingsPage.save();
    // Expenses exclude the Debts expenses.
    const expenseStatsPage = new ExpenseStatsPage(page);
    await expenseStatsPage.goto();
    await expenseStatsPage.selectDuration('Last 6 months');
    await expenseStatsPage.expectMonthlyChartAmounts([0, 0, 0, 0, 0, 300]);
  });

  test('include a previously excluded category', async ({
    page,
    seed,
    loginAs,
  }) => {
    const {user, account} = await seed.createUserWithTestData();
    const fun = await seed.createCategory(user.id, {name: 'Fun'});
    const debts = await seed.createCategory(user.id, {name: 'Debts'});
    await seed.createExpense(user.id, account.id, fun.id, 200, 'Netflix');
    await seed.createExpense(user.id, account.id, debts.id, 400, 'Wife');
    await seed.updateDisplaySettings(user.id, {
      excludeCategoryIdsInStats: String(debts.id),
    });
    await loginAs(user);
    const expenseStatsPage = new ExpenseStatsPage(page);
    await expenseStatsPage.goto();
    await expenseStatsPage.selectDuration('Last 6 months');
    // Initially only Fun appears in stats (200)
    await expenseStatsPage.expectMonthlyChartAmounts([0, 0, 0, 0, 0, 200]);
    // Remove Entertainment from exclusion
    const settingsPage = new DisplaySettingsPage(page);
    await settingsPage.goto();
    await settingsPage.removeExcludedCategory('Debts');
    await settingsPage.save();
    await expenseStatsPage.goto();
    await expenseStatsPage.selectDuration('Last 6 months');
    // All expenses now appear in stats (200 + 400 = 600)
    await expenseStatsPage.expectMonthlyChartAmounts([0, 0, 0, 0, 0, 600]);
  });
});
