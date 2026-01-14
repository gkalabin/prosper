import {expect, test} from '../lib/fixtures/test-base';
import {ExpenseStatsPage} from '../pages/ExpenseStatsPage';
import {OverviewPage} from '../pages/OverviewPage';
import {TransactionListPage} from '../pages/TransactionListPage';

test.describe('Multi-Currency Operations', () => {
  test.describe('Exchange Rate Handling', () => {
    test('converts foreign currency to display currency', async ({
      page,
      seed,
      loginAs,
    }) => {
      // Given: User with accounts in USD and EUR, display currency is USD
      const user = await seed.createUser();
      const bank = await seed.createBank(user.id, {name: 'Deutsche Bank'});
      await seed.createAccount(user.id, bank.id, {
        name: 'USD Account',
        currencyCode: 'USD',
        initialBalanceCents: 100000, // $1000
      });
      await seed.createAccount(user.id, bank.id, {
        name: 'EUR Account',
        currencyCode: 'EUR',
        initialBalanceCents: 100000, // €1000
      });
      await seed.createCategory(user.id, {name: 'General'});

      // Exchange rate: 1 EUR = 1.2 USD
      await seed.createExchangeRate('EUR', 'USD', 1.2);

      await loginAs(user);

      // When: Navigate to overview
      const overviewPage = new OverviewPage(page);
      await overviewPage.goto();

      // Then: Total = $1000 USD + (€1000 * 1.2) = $1000 + $1200 = $2200
      await overviewPage.expectTotalBalance('$2,200');
    });

    test('handles missing exchange rate gracefully', async ({
      page,
      seed,
      loginAs,
    }) => {
      // Given: User with account in currency without exchange rate (CHF)
      const user = await seed.createUser();
      const bank = await seed.createBank(user.id, {name: 'Swiss Bank'});
      await seed.createAccount(user.id, bank.id, {
        name: 'CHF Account',
        currencyCode: 'CHF',
        initialBalanceCents: 50000, // 500 CHF
      });
      await seed.createCategory(user.id);
      // No exchange rate for CHF -> USD

      await loginAs(user);

      // When: Navigate to overview
      const overviewPage = new OverviewPage(page);
      await overviewPage.goto();

      // Then: Page loads without error and shows the account
      await overviewPage.expectBankWithAccounts('Swiss Bank', ['CHF Account']);
    });
  });

  test.describe('Balance Calculations', () => {
    test('calculates total balance with multiple currencies', async ({
      page,
      seed,
      loginAs,
    }) => {
      // Given: User with accounts in USD and EUR
      const user = await seed.createUser();
      const bank = await seed.createBank(user.id, {name: 'International Bank'});
      await seed.createAccount(user.id, bank.id, {
        name: 'USD Account',
        currencyCode: 'USD',
        initialBalanceCents: 100000, // $1000
      });
      await seed.createAccount(user.id, bank.id, {
        name: 'EUR Account',
        currencyCode: 'EUR',
        initialBalanceCents: 50000, // €500
      });
      await seed.createCategory(user.id);

      // Exchange rate: 1 EUR = 1.2 USD
      await seed.createExchangeRate('EUR', 'USD', 1.2);

      await loginAs(user);

      // When: Navigate to overview
      const overviewPage = new OverviewPage(page);
      await overviewPage.goto();

      // Then: Total = $1000 + (€500 * 1.2) = $1000 + $600 = $1600
      await overviewPage.expectTotalBalance('$1,600');
    });

    test('displays balance in configured display currency', async ({
      page,
      seed,
      loginAs,
    }) => {
      // Given: User with USD account, display currency set to GBP
      const user = await seed.createUser();
      const bank = await seed.createBank(user.id);
      await seed.createAccount(user.id, bank.id, {
        name: 'USD Account',
        currencyCode: 'USD',
        initialBalanceCents: 100000, // $1000
      });
      await seed.createAccount(user.id, bank.id, {
        name: 'GBP Account',
        currencyCode: 'GBP',
        initialBalanceCents: 100000, // £1000
      });
      await seed.createCategory(user.id);
      await seed.updateDisplaySettings(user.id, {displayCurrencyCode: 'GBP'});

      // Exchange rate: 1 USD = 0.8 GBP
      await seed.createExchangeRate('USD', 'GBP', 0.8);

      await loginAs(user);

      // When: Navigate to overview
      const overviewPage = new OverviewPage(page);
      await overviewPage.goto();

      // Then: Total = £1000 + ($1000 * 0.8) = £1000 + £800 = £1800
      await overviewPage.expectTotalBalance('£1,800');
    });
  });
});

test.describe('Account Balance Integrity', () => {
  test.describe('Balance Verification', () => {
    test('account balance equals sum of all transactions', async ({
      page,
      seed,
      loginAs,
    }) => {
      // Given: User with account and various transactions
      const user = await seed.createUser();
      const bank = await seed.createBank(user.id, {name: 'Chase'});
      const account = await seed.createAccount(user.id, bank.id, {
        name: 'Checking',
        initialBalanceCents: 100000, // $1000 initial
      });
      const account2 = await seed.createAccount(user.id, bank.id, {
        name: 'Savings',
        initialBalanceCents: 50000, // $500 initial
      });
      const category = await seed.createCategory(user.id);

      // Add income: +$500
      await seed.createIncome(
        user.id,
        account.id,
        category.id,
        500,
        'Employer'
      );
      // Add expense: -$200
      await seed.createExpense(
        user.id,
        account.id,
        category.id,
        200,
        'Grocery Store'
      );
      // Transfer out: -$100 from Checking, +$100 to Savings
      await seed.createTransfer(
        user.id,
        account.id,
        account2.id,
        category.id,
        100
      );

      await loginAs(user);

      // When: Navigate to overview
      const overviewPage = new OverviewPage(page);
      await overviewPage.goto();

      // Then:
      // Checking: $1000 + $500 - $200 - $100 = $1200
      // Savings: $500 + $100 = $600
      // Total = $1200 + $600 = $1800
      await overviewPage.expectTotalBalance('$1,800');
    });

    test('balance handles mixed transaction types correctly', async ({
      page,
      seed,
      loginAs,
    }) => {
      // Given: Complex scenario with multiple transaction types
      const user = await seed.createUser();
      const bank = await seed.createBank(user.id, {name: 'Wells Fargo'});
      const account1 = await seed.createAccount(user.id, bank.id, {
        name: 'Primary',
        initialBalanceCents: 100000, // $1000 initial
      });
      const account2 = await seed.createAccount(user.id, bank.id, {
        name: 'Secondary',
        initialBalanceCents: 0,
      });
      const category = await seed.createCategory(user.id);

      // Income $500 to account1
      await seed.createIncome(
        user.id,
        account1.id,
        category.id,
        500,
        'Side Gig'
      );
      // Expense $200 from account1
      await seed.createExpense(
        user.id,
        account1.id,
        category.id,
        200,
        'Restaurant'
      );
      // Income $400 to account2
      await seed.createIncome(user.id, account2.id, category.id, 400, 'Bonus');
      // Transfer $100 from account1 to account2
      await seed.createTransfer(
        user.id,
        account1.id,
        account2.id,
        category.id,
        100
      );
      // Transfer $300 from account2 to account1
      await seed.createTransfer(
        user.id,
        account2.id,
        account1.id,
        category.id,
        300
      );

      await loginAs(user);

      // When: Navigate to overview
      const overviewPage = new OverviewPage(page);
      await overviewPage.goto();

      // Then:
      // account1: $1000 + $500 - $200 - $100 + $300 = $1500
      // account2: $0 + $400 + $100 - $300 = $200
      // Total: $1500 + $200 = $1700
      await overviewPage.expectTotalBalance('$1,700');
    });
  });

  test.describe('Split Expense Accounting', () => {
    test('split expense deducts full amount from account balance', async ({
      page,
      seed,
      loginAs,
    }) => {
      // Given: User with $1000 account balance
      const {user, account, category} = await seed.createUserWithTestData({
        bank: {name: 'Barclays'},
        account: {name: 'Joint Account', initialBalanceCents: 100000}, // $1000
        category: {name: 'Dining'},
      });

      // Create split expense: total $100, own share $60
      // outgoingAmountCents is set from 'amount' = 100 * 100 = 10000 cents
      // ownShareAmountCents overridden to 6000 cents = $60
      await seed.createExpense(
        user.id,
        account.id,
        category.id,
        100, // Full $100 leaves the account
        'Fancy Restaurant',
        {
          ownShareAmountCents: 6000, // $60 own share
          otherPartyName: 'Partner',
        }
      );

      await loginAs(user);

      // When: Navigate to overview
      const overviewPage = new OverviewPage(page);
      await overviewPage.goto();

      // Then: Account balance is $900 (reduced by full $100, not just own share)
      await overviewPage.expectTotalBalance('$900');
    });

    test('split expense shows own share in stats', async ({
      page,
      seed,
      loginAs,
    }) => {
      // Given: User with split expense
      const {user, account, category} = await seed.createUserWithTestData({
        bank: {name: 'Monzo'},
        account: {name: 'Personal', initialBalanceCents: 100000},
        category: {name: 'Entertainment'},
      });

      // Create a split expense: total $100, own share $60
      await seed.createExpense(
        user.id,
        account.id,
        category.id,
        100, // Total $100 leaves account
        'Concert Tickets',
        {
          ownShareAmountCents: 6000, // $60 own share
          otherPartyName: 'Friend',
        }
      );

      await loginAs(user);

      // When: Navigate to expense stats
      const statsPage = new ExpenseStatsPage(page);
      await statsPage.goto();
      await statsPage.selectDuration('Last 6 months');

      // Then: Stats show $60 (own share), not $100
      // Chart shows 6 months: previous 5 months with no expenses, current month with $60
      await statsPage.expectMonthlyChartAmounts([0, 0, 0, 0, 0, 60]);
    });
  });
});

test.describe('Data Consistency', () => {
  test('transaction edit updates balances correctly', async ({
    page,
    seed,
    loginAs,
  }) => {
    // Given: User with account at $1000 and expense of $100
    const {user, account, category} = await seed.createUserWithTestData({
      bank: {name: 'Santander'},
      account: {name: 'Current', initialBalanceCents: 100000}, // $1000
    });
    await seed.createExpense(user.id, account.id, category.id, 100, 'Amazon');

    await loginAs(user);

    // Verify initial balance is $900
    const overviewPage = new OverviewPage(page);
    await overviewPage.goto();
    await overviewPage.expectTotalBalance('$900');

    // When: Edit expense to $50
    const listPage = new TransactionListPage(page);
    await listPage.goto();
    const form = await listPage.openEditForm('Amazon');
    await form.editExpense({amount: 50, vendor: 'Amazon'});

    // Then: Balance is now $950
    await overviewPage.goto();
    await overviewPage.expectTotalBalance('$950');
  });

  test('transfer maintains zero-sum across accounts', async ({
    page,
    seed,
    loginAs,
  }) => {
    // Given: User with two accounts: A=$1000, B=$500
    const user = await seed.createUser();
    const bank = await seed.createBank(user.id, {name: 'HSBC'});
    const accountA = await seed.createAccount(user.id, bank.id, {
      name: 'Checking',
      initialBalanceCents: 100000, // $1000
    });
    const accountB = await seed.createAccount(user.id, bank.id, {
      name: 'Savings',
      initialBalanceCents: 50000, // $500
    });
    const category = await seed.createCategory(user.id);

    // Create transfer $200 from A to B
    await seed.createTransfer(
      user.id,
      accountA.id,
      accountB.id,
      category.id,
      200
    );

    await loginAs(user);

    // When: Navigate to overview
    const overviewPage = new OverviewPage(page);
    await overviewPage.goto();

    // Then: A=$800, B=$700, Total unchanged at $1500
    await overviewPage.expectBankWithAccounts('HSBC', ['Checking', 'Savings']);
    // Total balance should remain $1500 (transfers are zero-sum)
    await overviewPage.expectTotalBalance('$1,500');

    // Verify individual account balances via clicking through
    await overviewPage.clickAccount('Checking');
    await expect(page.getByText('$800')).toBeVisible();
    await overviewPage.goto();
    await overviewPage.clickAccount('Savings');
    await expect(page.getByText('$700')).toBeVisible();
  });
});
