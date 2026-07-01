import {subDays} from 'date-fns';
import {test} from '../../lib/fixtures/test-base';
import {OverviewPage} from '../../pages/OverviewPage';

test.describe('Overview net worth', () => {
  test('converts total to display currency', async ({page, seed, loginAs}) => {
    const {user} = await seed.createUserWithMultipleAccounts({
      accounts: [
        {currencyCode: 'USD', initialBalance: 1000},
        {currencyCode: 'GBP', initialBalance: 1000},
      ],
    });
    await seed.updateDisplaySettings(user.id, {displayCurrencyCode: 'GBP'});
    await seed.createExchangeRate('USD', 'GBP', 0.8); // 1 USD = 0.8 GBP
    await loginAs(user);
    const overviewPage = new OverviewPage(page);
    await overviewPage.goto();
    await overviewPage.expectTotalBalance('£1,800');
  });

  test('timeline shows net worth at the start and end of the range', async ({
    page,
    seed,
    loginAs,
  }) => {
    const {
      user,
      category,
      accounts: [current, savings],
    } = await seed.createUserWithMultipleAccounts({
      bank: {name: 'HSBC'},
      accounts: [
        {name: 'Current', currencyCode: 'USD'},
        {name: 'Savings', currencyCode: 'USD'},
      ],
    });
    const now = new Date();
    // The default range is 1 year. Income booked before the window sets the
    // start endpoint ($3,000); the activity inside the window moves net worth
    // to the end endpoint. The transfer shuffles money between accounts without
    // changing net worth, so only the expense and income shift the total.

    // Before 1 year cutoff:
    await seed.income('Salary', 2000, {
      user,
      account: current,
      category,
      timestamp: subDays(now, 400),
    });
    await seed.income('Interest', 1000, {
      user,
      account: savings,
      category,
      timestamp: subDays(now, 400),
    });
    await seed.transfer(1000, {
      user,
      from: current,
      to: savings,
      category,
      timestamp: subDays(now, 400),
    });
    // Within 1 year window:
    await seed.expense('Rent', 500, {
      user,
      account: current,
      category,
      timestamp: subDays(now, 100),
    });
    await seed.transfer(800, {
      user,
      from: current,
      to: savings,
      category,
      timestamp: subDays(now, 60),
    });
    await seed.income('Bonus', 1200, {
      user,
      account: current,
      category,
      timestamp: subDays(now, 30),
    });
    await loginAs(user);
    const overviewPage = new OverviewPage(page);
    await overviewPage.goto();
    await overviewPage.expectRangeAmounts('$3,000', '$3,700');
  });

  test('timeline applies the opening balance before any transactions', async ({
    page,
    seed,
    loginAs,
  }) => {
    const {user, category, account} = await seed.createUserWithTestData({});
    const now = new Date();
    // The opening balance row is timestamped at account creation,
    // but the user can (and should be able to) create transactions in the past.
    // This test simulates opening balance created AFTER first transactions,
    // but it is expected to take an effect before any transactions.
    await seed.openingBalance({
      userId: user.id,
      bankAccountId: account.id,
      initialBalance: 1000,
      timestamp: now,
    });
    await seed.expense('Rent', 300, {
      user,
      account,
      category,
      timestamp: subDays(now, 400),
    });
    await seed.income('Bonus', 500, {
      user,
      account,
      category,
      timestamp: subDays(now, 30),
    });
    await loginAs(user);
    const overviewPage = new OverviewPage(page);
    await overviewPage.goto();
    await overviewPage.selectNetWorthRange('6 months');
    await overviewPage.expectRangeAmounts('$700', '$1,200');
  });
});
