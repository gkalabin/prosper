import {subMonths} from 'date-fns';
import {test} from '../../lib/fixtures/test-base';
import {CashflowStatsPage} from '../../pages/CashflowStatsPage';
import {IncomeStatsPage} from '../../pages/IncomeStatsPage';

test.describe('Income Stats', () => {
  test('displays monthly income chart', async ({page, seed, loginAs}) => {
    // Given: user with income across multiple months
    const {user, account, category} = await seed.createUserWithTestData();
    const now = new Date();
    const addIncome = (amount: number, timestamp: Date) =>
      seed.createIncome(user.id, account.id, category.id, amount, 'Employer', {
        timestamp,
      });
    // This month - total income is 3000 (2000+1000)
    await addIncome(2000, now);
    await addIncome(1000, now);
    // Last month - total income is 5000 (3000+2000)
    await addIncome(3000, subMonths(now, 1));
    await addIncome(2000, subMonths(now, 1));
    // Two months ago - total income is 4000
    await addIncome(4000, subMonths(now, 2));
    await loginAs(user);
    // When: navigating to income statistics page
    const incomeStatsPage = new IncomeStatsPage(page);
    await incomeStatsPage.goto();
    // Then: page loads and monthly chart shows total income by month
    await incomeStatsPage.selectDuration('Last 6 months');
    await incomeStatsPage.expectMonthlyChartVisible();
    await incomeStatsPage.expectMonthlyChartAmounts([
      0, 0, 0, 4000, 5000, 3000,
    ]);
  });

  test('displays yearly income chart', async ({page, seed, loginAs}) => {
    // Given: user with income across multiple years
    const {user, account, category} = await seed.createUserWithTestData();
    const thisYear = new Date();
    const lastYear = new Date(thisYear.getFullYear() - 1, 6, 15);
    const twoYearsAgo = new Date(thisYear.getFullYear() - 2, 3, 10);
    const addIncome = (amount: number, timestamp: Date) =>
      seed.createIncome(
        user.id,
        account.id,
        category.id,
        amount,
        'Client ABC',
        {
          timestamp,
        }
      );
    // This year - total income is 8000 (5000+3000)
    await addIncome(5000, thisYear);
    await addIncome(3000, thisYear);
    // Last year - total income is 12000 (7000+5000)
    await addIncome(7000, lastYear);
    await addIncome(5000, lastYear);
    // Two years ago - total income is 6000
    await addIncome(6000, twoYearsAgo);
    await loginAs(user);
    // When: navigating to income statistics page
    const incomeStatsPage = new IncomeStatsPage(page);
    await incomeStatsPage.goto();
    // Then: page loads and yearly chart shows total income by year
    await incomeStatsPage.selectDuration('All time');
    await incomeStatsPage.expectYearlyChartVisible();
    await incomeStatsPage.expectYearlyChartAmounts([6000, 12000, 8000]);
  });

  test('converts income to display currency', async ({page, seed, loginAs}) => {
    // Given: user with income in multiple currencies (EUR and USD)
    const user = await seed.createUser();
    const bank = await seed.createBank(user.id, {name: 'Deutsche Bank'});
    const usdAccount = await seed.createAccount(user.id, bank.id, {
      name: 'USD Account',
      currencyCode: 'USD',
    });
    const eurAccount = await seed.createAccount(user.id, bank.id, {
      name: 'EUR Account',
      currencyCode: 'EUR',
    });
    const category = await seed.createCategory(user.id, {name: 'Salary'});
    // Set display currency to EUR
    await seed.updateDisplaySettings(user.id, {displayCurrencyCode: 'EUR'});
    // Create exchange rate: 1 USD = 0.85 EUR
    await seed.createExchangeRate('USD', 'EUR', 0.85);
    const now = new Date();
    // Income: 1000 USD (converts to 850 EUR) + 500 EUR = 1350 EUR total
    await seed.createIncome(
      user.id,
      usdAccount.id,
      category.id,
      1000,
      'US Client',
      {timestamp: now}
    );
    await seed.createIncome(
      user.id,
      eurAccount.id,
      category.id,
      500,
      'EU Client',
      {timestamp: now}
    );
    await loginAs(user);
    // When: navigating to income statistics page
    const incomeStatsPage = new IncomeStatsPage(page);
    await incomeStatsPage.goto();
    // Then: all amounts are converted and displayed in EUR
    await incomeStatsPage.selectDuration('Last 6 months');
    await incomeStatsPage.expectMonthlyChartVisible();
    // 1000 USD * 0.85 = 850 EUR + 500 EUR = 1350 EUR
    await incomeStatsPage.expectMonthlyChartAmounts([0, 0, 0, 0, 0, 1350]);
  });

  test('displays net cashflow per month', async ({page, seed, loginAs}) => {
    // Given: user with both income and expenses
    const {user, account, category} = await seed.createUserWithTestData();
    const now = new Date();
    // This month: income 5000, expense 2000 → net +3000
    await seed.createIncome(
      user.id,
      account.id,
      category.id,
      5000,
      'Employer',
      {
        timestamp: now,
      }
    );
    await seed.createExpense(
      user.id,
      account.id,
      category.id,
      2000,
      'Landlord',
      {timestamp: now}
    );
    // Last month: income 3000, expense 4000 → net -1000
    await seed.createIncome(
      user.id,
      account.id,
      category.id,
      3000,
      'Employer',
      {timestamp: subMonths(now, 1)}
    );
    await seed.createExpense(
      user.id,
      account.id,
      category.id,
      4000,
      'Utilities',
      {timestamp: subMonths(now, 1)}
    );
    await loginAs(user);
    // When: navigating to cashflow statistics page
    const cashflowStatsPage = new CashflowStatsPage(page);
    await cashflowStatsPage.goto();
    // Then: monthly chart shows income, expense, and net cashflow
    await cashflowStatsPage.selectDuration('Last 6 months');
    await cashflowStatsPage.expectMonthlyCashflowChartVisible();
    // Net cashflow: income - expense for each month
    // Months: [0, 0, 0, 0, 3000-4000=-1000, 5000-2000=3000]
    await cashflowStatsPage.expectMonthlyCashflowAmounts([
      0, 0, 0, 0, -1000, 3000,
    ]);
    // Verify income chart values
    await cashflowStatsPage.expectMonthlyIncomeAmounts([
      0, 0, 0, 0, 3000, 5000,
    ]);
    // Verify expense chart values
    await cashflowStatsPage.expectMonthlyExpenseAmounts([
      0, 0, 0, 0, 4000, 2000,
    ]);
  });
});
