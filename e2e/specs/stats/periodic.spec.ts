import {format, subMonths} from 'date-fns';
import {test} from '../../lib/fixtures/test-base';
import {MonthlyStatsPage} from '../../pages/MonthlyStatsPage';
import {YearlyStatsPage} from '../../pages/YearlyStatsPage';

test.describe('Periodic Stats', () => {
  test('displays monthly summary with totals', async ({
    page,
    seed,
    loginAs,
  }) => {
    // Given: user with expenses and income for the current month
    const {user, account, category} = await seed.createUserWithTestData();
    const now = new Date();
    // Create expenses: total $500 ($150 + $350)
    await seed.createExpense(
      user.id,
      account.id,
      category.id,
      150,
      'Whole Foods',
      {timestamp: now}
    );
    await seed.createExpense(user.id, account.id, category.id, 350, 'Target', {
      timestamp: now,
    });
    // Create income: total $2000 ($1200 + $800)
    await seed.createIncome(
      user.id,
      account.id,
      category.id,
      1200,
      'Acme Corp',
      {timestamp: now}
    );
    await seed.createIncome(
      user.id,
      account.id,
      category.id,
      800,
      'Freelance',
      {timestamp: now}
    );
    await loginAs(user);
    // When: navigating to monthly stats page
    const monthlyStatsPage = new MonthlyStatsPage(page);
    await monthlyStatsPage.goto();
    // Then: summary shows correct totals
    await monthlyStatsPage.expectSpentAmount('$500');
    await monthlyStatsPage.expectReceivedAmount('$2,000');
    // Delta = income - expense = 2000 - 500 = 1500
    await monthlyStatsPage.expectDeltaAmount('$1,500');
    await monthlyStatsPage.expectExpenseCount(2);
    await monthlyStatsPage.expectIncomeCount(2);
  });

  test('navigates between months', async ({page, seed, loginAs}) => {
    // Given: user with expenses across multiple months
    const {user, account, category} = await seed.createUserWithTestData();
    const now = new Date();
    const lastMonth = subMonths(now, 1);
    // This month: expense at Trader Joe's
    await seed.createExpense(
      user.id,
      account.id,
      category.id,
      200,
      "Trader Joe's",
      {timestamp: now}
    );
    // Last month: expense at Costco
    await seed.createExpense(user.id, account.id, category.id, 450, 'Costco', {
      timestamp: lastMonth,
    });
    await loginAs(user);
    // When: navigating to monthly stats page
    const monthlyStatsPage = new MonthlyStatsPage(page);
    await monthlyStatsPage.goto();
    // Then: current month is selected and shows this month's transactions
    const currentMonthLabel = format(now, 'MMM yyyy');
    await monthlyStatsPage.expectMonthSelected(currentMonthLabel);
    await monthlyStatsPage.expectSpentAmount('$200');
    await monthlyStatsPage.expectTransactionVisible("Trader Joe's");
    // When: navigating to previous month
    const lastMonthLabel = format(lastMonth, 'MMM yyyy');
    await monthlyStatsPage.selectMonth(lastMonthLabel);
    // Then: last month's transactions are displayed
    await monthlyStatsPage.expectMonthSelected(lastMonthLabel);
    await monthlyStatsPage.expectSpentAmount('$450');
    await monthlyStatsPage.expectTransactionVisible('Costco');
    await monthlyStatsPage.expectTransactionNotVisible("Trader Joe's");
    // When: navigating back to current month
    await monthlyStatsPage.selectMonth(currentMonthLabel);
    // Then: current month's transactions are displayed again
    await monthlyStatsPage.expectMonthSelected(currentMonthLabel);
    await monthlyStatsPage.expectSpentAmount('$200');
    await monthlyStatsPage.expectTransactionVisible("Trader Joe's");
  });

  test('displays yearly summary with totals', async ({page, seed, loginAs}) => {
    // Given: user with expenses and income for current year
    const {user, account, category} = await seed.createUserWithTestData();
    const thisYear = new Date();
    // Create expenses across the year: total $1500
    await seed.createExpense(
      user.id,
      account.id,
      category.id,
      600,
      'Best Buy',
      {timestamp: thisYear}
    );
    await seed.createExpense(
      user.id,
      account.id,
      category.id,
      900,
      'Home Depot',
      {timestamp: thisYear}
    );
    // Create income for the year: total $5000
    await seed.createIncome(
      user.id,
      account.id,
      category.id,
      3000,
      'Employer',
      {timestamp: thisYear}
    );
    await seed.createIncome(
      user.id,
      account.id,
      category.id,
      2000,
      'Consulting',
      {timestamp: thisYear}
    );
    await loginAs(user);
    // When: navigating to yearly stats page
    const yearlyStatsPage = new YearlyStatsPage(page);
    await yearlyStatsPage.goto();
    // Then: summary shows correct yearly totals
    const currentYearLabel = format(thisYear, 'yyyy');
    await yearlyStatsPage.expectYearSelected(currentYearLabel);
    await yearlyStatsPage.expectSpentAmount('$1,500');
    await yearlyStatsPage.expectReceivedAmount('$5,000');
    // Delta = income - expense = 5000 - 1500 = 3500
    await yearlyStatsPage.expectDeltaAmount('$3,500');
    await yearlyStatsPage.expectExpenseCount(2);
    await yearlyStatsPage.expectIncomeCount(2);
  });
});
