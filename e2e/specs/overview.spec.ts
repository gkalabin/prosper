import {test} from '../lib/fixtures/test-base';
import {OverviewPage} from '../pages/OverviewPage';

test.describe('Overview', () => {
  test('transactions impact the total', async ({page, seed, loginAs}) => {
    const {
      user,
      category: c,
      accounts: [current, savings],
    } = await seed.createUserWithMultipleAccounts({
      bank: {name: 'HSBC'},
      accounts: [
        {name: 'Current', currencyCode: 'USD', initialBalanceCents: 10000}, // $100
        {name: 'Savings', currencyCode: 'USD', initialBalanceCents: 20000}, // $200
      ],
    });
    await seed.createExpense(user.id, current.id, c.id, 40, 'KFC'); // Current is now $60
    await seed.createIncome(user.id, savings.id, c.id, 1000, 'Salary'); // Savings is $1200
    await seed.createTransfer(user.id, savings.id, current.id, c.id, 140); // Move $140 from Savings to Current
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
        {currencyCode: 'USD', initialBalanceCents: 100000}, // $1000
        {currencyCode: 'GBP', initialBalanceCents: 100000}, // £1000
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
      bank: {
        name: 'Swiss Bank',
      },
      account: {
        name: 'Current',
        currencyCode: 'CHF',
        initialBalanceCents: 50000, // 500 CHF
      },
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
        {
          name: 'Current',
          currencyCode: 'USD',
          initialBalanceCents: 50000,
        },
        {
          name: 'Savings',
          currencyCode: 'USD',
          initialBalanceCents: 0,
          archived: true,
        },
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
      account: {name: 'Freedom Card', initialBalanceCents: -25000},
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
      bank: {
        name: 'Vanguard',
      },
      account: {
        name: 'AAPL Holdings',
        initialBalanceCents: 1000, // 10 shares
        stockId: stock.id,
      },
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
      bank: {
        name: 'Vanguard',
      },
      account: {
        name: 'TSLA Holdings',
        initialBalanceCents: 1000, // 10 shares
        stockId: stock.id,
      },
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
