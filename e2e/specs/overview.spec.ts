import {test} from '../lib/fixtures/test-base';
import {OverviewPage} from '../pages/OverviewPage';

test.describe('Overview', () => {
  test('transactions impact the total', async ({page, seed, loginAs}) => {
    const {
      user,
      category,
      accounts: [current, savings],
    } = await seed.createUserWithMultipleAccounts({
      bank: {name: 'HSBC'},
      accounts: [
        {name: 'Current', currencyCode: 'USD', initialBalance: 100},
        {name: 'Savings', currencyCode: 'USD', initialBalance: 200},
      ],
    });
    await seed.expense('KFC', 40, {user, account: current, category}); // Current is now $60
    await seed.income('Salary', 1000, {user, account: savings, category}); // Savings is $1200
    await seed.transfer(140, {user, from: savings, to: current, category}); // Move $140 from Savings to Current
    await loginAs(user);
    const overviewPage = new OverviewPage(page);
    await overviewPage.goto();
    await overviewPage.expectTotalBalance('$1,260');
    await overviewPage.expectAccountBalance('HSBC', 'Current', '$200');
    await overviewPage.expectAccountBalance('HSBC', 'Savings', '$1,060');
  });

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

  test('handles missing exchange rates', async ({page, seed, loginAs}) => {
    const {user} = await seed.createUserWithTestData({
      bank: {name: 'Swiss Bank'},
      account: {name: 'Current', currencyCode: 'CHF', initialBalance: 500},
    });
    await seed.updateDisplaySettings(user.id, {displayCurrencyCode: 'USD'});
    // No exchange rate for CHF -> USD, so the account balance should display
    // in the original currency (CHF) rather than the display currency (USD).
    await loginAs(user);
    const overviewPage = new OverviewPage(page);
    await overviewPage.goto();
    await overviewPage.expectAccountBalance('Swiss Bank', 'Current', 'CHF 500');
  });

  test('hides archived accounts', async ({page, seed, loginAs}) => {
    const {user} = await seed.createUserWithMultipleAccounts({
      bank: {name: 'Barclays'},
      accounts: [
        {name: 'Current', currencyCode: 'USD', initialBalance: 500},
        {name: 'Savings', currencyCode: 'USD', archived: true},
      ],
    });
    await loginAs(user);
    const overviewPage = new OverviewPage(page);
    await overviewPage.goto();
    await overviewPage.expectBankWithAccounts('Barclays', ['Current']);
    await overviewPage.expectAccountNotVisible('Barclays', 'Savings');
    await overviewPage.expectTotalBalance('$500');
  });

  test('displays negative balance', async ({page, seed, loginAs}) => {
    const {user} = await seed.createUserWithTestData({
      bank: {name: 'Chase'},
      account: {name: 'Freedom Card', initialBalance: -250},
    });
    await loginAs(user);
    const overviewPage = new OverviewPage(page);
    await overviewPage.goto();
    await overviewPage.expectAccountBalance('Chase', 'Freedom Card', '-$250');
    await overviewPage.expectTotalBalance('-$250');
  });

  test('accounts with stocks', async ({page, seed, loginAs}) => {
    const stock = await seed.createStock({
      name: 'Apple',
      ticker: 'AAPL',
      exchange: 'NASDAQ',
      currencyCode: 'USD',
    });
    await seed.createStockQuote(stock.id, 15000); // $150 per share
    const {user} = await seed.createUserWithTestData({
      bank: {name: 'Vanguard'},
      account: {name: 'AAPL Holdings', initialBalance: 10, stockId: stock.id},
    });
    await loginAs(user);
    const overviewPage = new OverviewPage(page);
    await overviewPage.goto();
    await overviewPage.expectBankWithAccounts('Vanguard', ['AAPL Holdings']);
    await overviewPage.expectTotalBalance('$1,500'); // 10 shares x $150
  });

  test('converts stock value to display currency', async ({
    page,
    seed,
    loginAs,
  }) => {
    const stock = await seed.createStock({
      name: 'Tesla',
      ticker: 'TSLA',
      exchange: 'NASDAQ',
      currencyCode: 'USD',
    });
    await seed.createStockQuote(stock.id, 15000); // $150 per share
    const {user} = await seed.createUserWithTestData({
      bank: {name: 'Vanguard'},
      account: {name: 'TSLA Holdings', initialBalance: 10, stockId: stock.id},
    });
    await seed.updateDisplaySettings(user.id, {displayCurrencyCode: 'EUR'});
    await seed.createExchangeRate('USD', 'EUR', 0.92); // 1 USD = 0.92 EUR
    await loginAs(user);
    const overviewPage = new OverviewPage(page);
    await overviewPage.goto();
    await overviewPage.expectBankWithAccounts('Vanguard', ['TSLA Holdings']);
    await overviewPage.expectTotalBalance('€ 1.380'); // 10 shares x $150 x 0.92
  });
});
