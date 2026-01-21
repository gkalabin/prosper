import {expect, test} from '../../lib/fixtures/test-base';
import {BankConfigPage} from '../../pages/BankConfigPage';
import {OverviewPage} from '../../pages/OverviewPage';

test.describe('Bank Management', () => {
  test('creates a new bank', async ({page, seed, loginAs}) => {
    // Given: user exists
    const user = await seed.createUser();
    await loginAs(user);
    // When: navigate to bank config and create a new bank
    const bankConfigPage = new BankConfigPage(page);
    await bankConfigPage.goto();
    await bankConfigPage.createBank('ABN Amro');
    // Then: the bank appears in the list
    await expect(bankConfigPage.getBankSection('ABN Amro')).toBeVisible();
  });

  test('edits an existing bank name', async ({page, seed, loginAs}) => {
    // Given: user exists with a bank
    const user = await seed.createUser();
    const bank = await seed.createBank(user.id, {name: 'ABN Amro'});
    await loginAs(user);
    // When: navigate to bank config and edit the bank name
    const bankConfigPage = new BankConfigPage(page);
    await bankConfigPage.goto();
    await bankConfigPage.editBank({
      currentName: bank.name,
      newName: 'ING',
    });
    // Then: the bank appears with the new name
    await expect(bankConfigPage.getBankSection('ING')).toBeVisible();
    await expect(bankConfigPage.getBankSection('ABN Amro')).not.toBeVisible();
  });
});

test.describe('Account Management', () => {
  test('creates a new account with currency', async ({page, seed, loginAs}) => {
    // Given: user with a bank
    const user = await seed.createUser();
    const bank = await seed.createBank(user.id, {name: 'ING'});
    await loginAs(user);
    // When: creating a new account
    const bankConfigPage = new BankConfigPage(page);
    await bankConfigPage.goto();
    await bankConfigPage.createAccount({
      bankName: bank.name,
      accountName: 'Savings',
      currency: 'USD',
      balance: 1000,
    });
    // Then: the account appears under the bank
    const bankSection = bankConfigPage.getBankSection(bank.name);
    await expect(bankSection.getByText('Savings')).toBeVisible();
  });

  test('creates an account with stock/ETF unit', async ({
    page,
    seed,
    loginAs,
  }) => {
    // Given
    const user = await seed.createUser();
    const bank = await seed.createBank(user.id, {name: 'Interactive Brokers'});
    const stock = await seed.createStock({
      name: 'Apple',
      ticker: 'AAPL',
      exchange: 'NASDAQ',
      currencyCode: 'USD',
    });
    // This avoids fallback stock quotes backfill and removes noise in the logs.
    await seed.createStockQuote(stock.id, 150);
    await loginAs(user);
    // When
    const bankConfigPage = new BankConfigPage(page);
    await bankConfigPage.goto();
    await bankConfigPage.createAccount({
      bankName: bank.name,
      accountName: 'AAPL Stock',
      currency: `${stock.name} (${stock.ticker})`,
      balance: 50, // number of shares
    });
    // Then
    const bankSection = bankConfigPage.getBankSection(bank.name);
    await expect(bankSection.getByText('AAPL Stock')).toBeVisible();
  });

  test('edits an existing account name', async ({page, seed, loginAs}) => {
    // Given
    const user = await seed.createUser();
    const bank = await seed.createBank(user.id, {name: 'Barclays'});
    await seed.createAccount(user.id, bank.id, {name: 'Current'});
    await loginAs(user);
    // When
    const bankConfigPage = new BankConfigPage(page);
    await bankConfigPage.goto();
    await bankConfigPage.editAccount({
      bankName: bank.name,
      currentAccountName: 'Current',
      newAccountName: 'Main',
    });
    // Then
    const bankSection = bankConfigPage.getBankSection('Barclays');
    await expect(bankSection.getByText('Main')).toBeVisible();
    await expect(bankSection.getByText('Current')).not.toBeVisible();
  });

  test('archives an account', async ({page, seed, loginAs}) => {
    // Given
    const {user, bank, account} = await seed.createUserWithTestData({
      bank: {name: 'Santander'},
      account: {name: 'Savings'},
    });
    await loginAs(user);
    // When
    const bankConfigPage = new BankConfigPage(page);
    await bankConfigPage.goto();
    await bankConfigPage.editAccount({
      bankName: bank.name,
      currentAccountName: account.name,
      newArchivedState: true,
    });
    // Then
    const bankSection = bankConfigPage.getBankSection('Santander');
    // The account still appears in bank config, so can be managed
    await expect(bankSection.getByText('Savings', {exact: true})).toBeVisible();
    // The account is not shown on the overview page
    const overview = new OverviewPage(page);
    await overview.goto();
    await overview.expectAccountNotVisible('Santander', 'Savings');
  });

  test('unarchives an archived account', async ({page, seed, loginAs}) => {
    // Given
    const {user, bank, account} = await seed.createUserWithTestData({
      bank: {name: 'Monzo'},
      account: {name: 'Travel', archived: true},
    });
    await loginAs(user);
    // Verify account is not on the overview initially
    const overview = new OverviewPage(page);
    await overview.goto();
    await overview.expectAccountNotVisible('Monzo', 'Travel');
    // When
    const bankConfigPage = new BankConfigPage(page);
    await bankConfigPage.goto();
    await bankConfigPage.editAccount({
      bankName: bank.name,
      currentAccountName: account.name,
      newArchivedState: false,
    });
    // Then
    await overview.goto();
    await overview.expectBankWithAccounts('Monzo', ['Travel']);
  });
});
