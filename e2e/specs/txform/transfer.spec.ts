import {expect, test} from '../../lib/fixtures/test-base';
import {NewTransactionPage} from '../../pages/NewTransactionPage';
import {OverviewPage} from '../../pages/OverviewPage';
import {TransactionListPage} from '../../pages/TransactionListPage';

test.describe('Transfer Transactions', () => {
  test.describe('Same Currency Transfers', () => {
    test('creates a transfer between accounts in same currency', async ({
      page,
      seed,
      loginAs,
    }) => {
      // Given: User with bank and two accounts in USD
      const user = await seed.createUser();
      const bank = await seed.createBank(user.id, {name: 'Barclays'});
      const account1 = await seed.createAccount(user.id, bank.id, {
        name: 'Current',
        initialBalanceCents: 100000, // $1000
      });
      const account2 = await seed.createAccount(user.id, bank.id, {
        name: 'Savings',
        initialBalanceCents: 50000, // $500
      });
      const category = await seed.createCategory(user.id, {name: 'Transfers'});
      await loginAs(user);

      // When: Create a transfer from Current to Savings
      const addTxPage = new NewTransactionPage(page);
      await addTxPage.goto();
      await addTxPage.form.addTransfer({
        amount: 200,
        datetime: new Date(),
        fromAccount: 'Current',
        toAccount: 'Savings',
        category: category.name,
      });

      // Then: Transfer appears in transaction list
      const listPage = new TransactionListPage(page);
      await listPage.goto();
      await expect(listPage.getTransactionListItem('$200')).toBeVisible();

      // And: Account balances are updated on overview
      const overviewPage = new OverviewPage(page);
      await overviewPage.goto();
      await overviewPage.expectAccountBalance('Barclays', 'Current', '$800');
      await overviewPage.expectAccountBalance('Barclays', 'Savings', '$700');
      await overviewPage.expectTotalBalance('$1,500');
    });

    test('edits an existing transfer', async ({page, seed, loginAs}) => {
      // Given: User with two accounts and a transfer between them
      const user = await seed.createUser();
      const bank = await seed.createBank(user.id, {name: 'HSBC'});
      const account1 = await seed.createAccount(user.id, bank.id, {
        name: 'Checking',
        initialBalanceCents: 100000, // $1000
      });
      const account2 = await seed.createAccount(user.id, bank.id, {
        name: 'Savings',
        initialBalanceCents: 50000, // $500
      });
      const category = await seed.createCategory(user.id, {name: 'Transfers'});
      // Create initial transfer of $150
      await seed.createTransfer(
        user.id,
        account1.id,
        account2.id,
        category.id,
        150
      );
      await loginAs(user);

      // Verify initial balances: Checking $850, Savings $650
      const overviewPage = new OverviewPage(page);
      await overviewPage.goto();
      await overviewPage.expectAccountBalance('HSBC', 'Checking', '$850');
      await overviewPage.expectAccountBalance('HSBC', 'Savings', '$650');

      // When: Edit the transfer to change amount to $300
      const listPage = new TransactionListPage(page);
      await listPage.goto();
      const form = await listPage.openEditForm('$150');
      await form.editTransfer({amount: 300});

      // Then: Updated amount in transaction list
      await listPage.goto();
      await expect(listPage.getTransactionListItem('$300')).toBeVisible();
      await expect(listPage.getTransactionListItem('$150')).not.toBeVisible();

      // And: Account balances reflect the change
      await overviewPage.goto();
      await overviewPage.expectAccountBalance('HSBC', 'Checking', '$700');
      await overviewPage.expectAccountBalance('HSBC', 'Savings', '$800');
    });
  });

  test.describe('Cross-Currency Transfers', () => {
    test('creates a transfer with currency conversion', async ({
      page,
      seed,
      loginAs,
    }) => {
      // Given: User with two accounts in different currencies (USD and EUR)
      const user = await seed.createUser();
      const bank = await seed.createBank(user.id, {name: 'Revolut'});
      const usdAccount = await seed.createAccount(user.id, bank.id, {
        name: 'USD Account',
        currencyCode: 'USD',
        initialBalanceCents: 100000, // $1000
      });
      const eurAccount = await seed.createAccount(user.id, bank.id, {
        name: 'EUR Account',
        currencyCode: 'EUR',
        initialBalanceCents: 50000, // €500
      });
      const category = await seed.createCategory(user.id, {
        name: 'Currency Exchange',
      });
      // Set exchange rate USD to EUR (1 USD = 0.92 EUR)
      await seed.createExchangeRate('USD', 'EUR', 0.92);
      await loginAs(user);

      // When: Create a transfer from USD to EUR
      const addTxPage = new NewTransactionPage(page);
      await addTxPage.goto();
      await addTxPage.form.addCrossCurrencyTransfer({
        amount: 100,
        amountReceived: 90, // Simulating €90 received
        datetime: new Date(),
        fromAccount: 'USD Account',
        toAccount: 'EUR Account',
        category: category.name,
      });

      // Then: Transfer appears in transaction list
      const listPage = new TransactionListPage(page);
      await listPage.goto();
      await expect(listPage.getTransactionListItem('$100')).toBeVisible();

      // And: Account balances are updated correctly
      const overviewPage = new OverviewPage(page);
      await overviewPage.goto();
      await overviewPage.expectAccountBalance('Revolut', 'USD Account', '$900');
      await overviewPage.expectAccountBalance(
        'Revolut',
        'EUR Account',
        '€ 590'
      );
    });

    test('displays converted amounts correctly on overview', async ({
      page,
      seed,
      loginAs,
    }) => {
      // Given: User with accounts in multiple currencies and transfers
      const user = await seed.createUser();
      const bank = await seed.createBank(user.id, {name: 'Wise'});
      const usdAccount = await seed.createAccount(user.id, bank.id, {
        name: 'USD Account',
        currencyCode: 'USD',
        initialBalanceCents: 100000, // $1000
      });
      const eurAccount = await seed.createAccount(user.id, bank.id, {
        name: 'EUR Account',
        currencyCode: 'EUR',
        initialBalanceCents: 100000, // €1000
      });
      const category = await seed.createCategory(user.id, {name: 'Transfers'});
      // Set exchange rate EUR to USD (1 EUR = 1.09 USD)
      await seed.createExchangeRate('EUR', 'USD', 1.09);
      // Set display currency to USD
      await seed.updateDisplaySettings(user.id, {displayCurrencyCode: 'USD'});
      await loginAs(user);

      // When: Navigate to overview
      const overviewPage = new OverviewPage(page);
      await overviewPage.goto();

      // Then: Total balance shows in display currency (USD)
      // USD Account: $1000, EUR Account: €1000 = $1090
      // Total: $2090 (rounded to $2,090)
      await overviewPage.expectTotalBalance('$2,090');
    });
  });
});
