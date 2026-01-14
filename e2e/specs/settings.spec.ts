import {expect, test} from '../lib/fixtures/test-base';
import {DisplaySettingsPage} from '../pages/DisplaySettingsPage';
import {ExpenseStatsPage} from '../pages/ExpenseStatsPage';
import {OverviewPage} from '../pages/OverviewPage';

test.describe('Settings', () => {
  test.describe('Display Currency', () => {
    test('changes display currency', async ({page, seed, loginAs}) => {
      // Given: User with USD account and initial balance
      const user = await seed.createUser();
      const bank = await seed.createBank(user.id, {name: 'Chase'});
      await seed.createAccount(user.id, bank.id, {
        name: 'Checking',
        currencyCode: 'USD',
        initialBalanceCents: 100000, // $1000
      });
      await seed.createCategory(user.id);
      // Create exchange rate: 1 USD = 0.92 EUR
      await seed.createExchangeRate('USD', 'EUR', 0.92);
      await loginAs(user);

      // When: Navigate to settings and change display currency to EUR
      const settingsPage = new DisplaySettingsPage(page);
      await settingsPage.goto();
      await settingsPage.selectDisplayCurrency('EUR');
      await settingsPage.save();

      // Then: Overview shows amounts in EUR
      // Note: App has caching that requires a hard refresh after settings change
      const overviewPage = new OverviewPage(page);
      await page.goto('/overview');
      await page.reload();
      await page.waitForLoadState('networkidle');
      // $1000 * 0.92 = €920
      await overviewPage.expectTotalBalance('€ 920');
    });

    test('persists display currency across sessions', async ({
      page,
      seed,
      loginAs,
    }) => {
      // Given: User with GBP display currency and USD account
      const user = await seed.createUser();
      const bank = await seed.createBank(user.id, {name: 'Barclays'});
      await seed.createAccount(user.id, bank.id, {
        name: 'Current',
        currencyCode: 'USD',
        initialBalanceCents: 50000, // $500
      });
      await seed.createCategory(user.id);
      // Set display currency to GBP
      await seed.updateDisplaySettings(user.id, {displayCurrencyCode: 'GBP'});
      // Create exchange rate: 1 USD = 0.79 GBP
      await seed.createExchangeRate('USD', 'GBP', 0.79);
      await loginAs(user);

      // First session: verify GBP is shown on overview
      const overviewPage = new OverviewPage(page);
      await overviewPage.goto();
      // $500 * 0.79 = £395
      await overviewPage.expectTotalBalance('£395');

      // When: Logout and login again
      await page.getByRole('button', {name: 'Open user menu'}).click();
      await page.getByRole('menuitem', {name: 'Sign Out'}).click();
      await expect(page).toHaveURL(/\/auth\/signin/);
      await loginAs(user);

      // Then: Display currency is still GBP after re-login
      await overviewPage.goto();
      await overviewPage.expectTotalBalance('£395');

      // Also verify settings page shows GBP as selected
      const settingsPage = new DisplaySettingsPage(page);
      await settingsPage.goto();
      await settingsPage.expectDisplayCurrency('GBP');
    });
  });

  test.describe('Category Exclusions', () => {
    test('excludes categories from statistics', async ({
      page,
      seed,
      loginAs,
    }) => {
      // Given: User with expenses in two categories (Groceries and Transfers)
      const user = await seed.createUser();
      const bank = await seed.createBank(user.id, {name: 'HSBC'});
      const account = await seed.createAccount(user.id, bank.id, {
        name: 'Checking',
      });
      const groceries = await seed.createCategory(user.id, {name: 'Groceries'});
      const transfers = await seed.createCategory(user.id, {name: 'Transfers'});
      const now = new Date();
      // Create expenses: 300 in Groceries, 700 in Transfers
      await seed.createExpense(
        user.id,
        account.id,
        groceries.id,
        300,
        'Whole Foods',
        {timestamp: now}
      );
      await seed.createExpense(
        user.id,
        account.id,
        transfers.id,
        700,
        'Wire Transfer',
        {timestamp: now}
      );
      await loginAs(user);

      // When: Navigate to settings and exclude Transfers category
      const settingsPage = new DisplaySettingsPage(page);
      await settingsPage.goto();
      await settingsPage.addExcludedCategory('Transfers');
      await settingsPage.save();

      // Then: Expense stats only show Groceries expenses (300)
      // Note: App has caching that requires a hard refresh after settings change
      const expenseStatsPage = new ExpenseStatsPage(page);
      await expenseStatsPage.goto();
      await page.reload();
      await page.waitForLoadState('networkidle');
      await expenseStatsPage.selectDuration('Last 6 months');
      await expenseStatsPage.expectMonthlyChartVisible();
      // Only Groceries: [0, 0, 0, 0, 0, 300]
      await expenseStatsPage.expectMonthlyChartAmounts([0, 0, 0, 0, 0, 300]);
    });

    test('includes back a previously excluded category', async ({
      page,
      seed,
      loginAs,
    }) => {
      // Given: User with an excluded category and expenses in it
      const user = await seed.createUser();
      const bank = await seed.createBank(user.id, {name: 'Santander'});
      const account = await seed.createAccount(user.id, bank.id, {
        name: 'Checking',
      });
      const entertainment = await seed.createCategory(user.id, {
        name: 'Entertainment',
      });
      const dining = await seed.createCategory(user.id, {name: 'Dining'});
      const now = new Date();
      // Create expenses: 200 in Entertainment, 400 in Dining
      await seed.createExpense(
        user.id,
        account.id,
        entertainment.id,
        200,
        'Netflix',
        {timestamp: now}
      );
      await seed.createExpense(
        user.id,
        account.id,
        dining.id,
        400,
        'Restaurant',
        {timestamp: now}
      );
      // Entertainment is initially excluded from stats
      await seed.updateDisplaySettings(user.id, {
        excludeCategoryIdsInStats: String(entertainment.id),
      });
      await loginAs(user);

      // Verify: Initially only Dining appears in stats (400)
      const expenseStatsPage = new ExpenseStatsPage(page);
      await expenseStatsPage.goto();
      await expenseStatsPage.selectDuration('Last 6 months');
      await expenseStatsPage.expectMonthlyChartAmounts([0, 0, 0, 0, 0, 400]);

      // When: Navigate to settings and remove Entertainment from exclusion
      const settingsPage = new DisplaySettingsPage(page);
      await settingsPage.goto();
      await settingsPage.expectCategoryExcluded('Entertainment');
      await settingsPage.removeExcludedCategory('Entertainment');
      await settingsPage.save();

      // Then: All expenses now appear in stats (200 + 400 = 600)
      // Note: App has caching that requires a hard refresh after settings change
      await expenseStatsPage.goto();
      await page.reload();
      await page.waitForLoadState('networkidle');
      await expenseStatsPage.selectDuration('Last 6 months');
      await expenseStatsPage.expectMonthlyChartAmounts([0, 0, 0, 0, 0, 600]);
    });
  });
});
