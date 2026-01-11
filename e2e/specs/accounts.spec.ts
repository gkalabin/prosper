import {expect, test} from '../lib/fixtures/test-base';
import {BankConfigPage} from '../pages/BankConfigPage';
import {LoginPage} from '../pages/LoginPage';

test.describe('Bank Management', () => {
  test('creates a new bank', async ({page, seed}) => {
    // Given: user exists
    const user = await seed.createUser();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(user.login, user.rawPassword);
    // When: navigate to bank config and create a new bank
    const bankConfigPage = new BankConfigPage(page);
    await bankConfigPage.goto();
    await bankConfigPage.createBank('ABN Amro');
    // Then: the bank appears in the list
    await expect(bankConfigPage.getBankSection('ABN Amro')).toBeVisible();
  });

  test('edits an existing bank name', async ({page, seed}) => {
    // Given: user exists with a bank
    const user = await seed.createUser();
    const bank = await seed.createBank(user.id, {name: 'ABN Amro'});
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(user.login, user.rawPassword);
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
  test('creates a new account with currency', async ({page, seed}) => {
    // Given: user with a bank
    const user = await seed.createUser();
    const bank = await seed.createBank(user.id, {name: 'ING'});
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(user.login, user.rawPassword);
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
});
