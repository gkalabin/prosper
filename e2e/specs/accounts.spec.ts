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

  test('edits an existing bank name', async () => {
    // TODO: Create user with a bank via seed
    // TODO: Log in
    // TODO: Navigate to bank configuration page
    // TODO: Click edit on the bank
    // TODO: Change bank name
    // TODO: Save changes
    // TODO: Verify updated name is displayed
  });
});

test.describe('Account Management', () => {
  test('creates a new account with currency', async () => {
    // TODO: Create user with a bank via seed
    // TODO: Log in
    // TODO: Navigate to bank configuration page
    // TODO: Click add account under the bank
    // TODO: Enter account name and select currency (e.g., USD)
    // TODO: Set initial balance
    // TODO: Submit form
    // TODO: Verify account appears under the bank
  });

  test('creates a new account with stock unit', async () => {
    // TODO: Create user with a bank via seed
    // TODO: Log in
    // TODO: Navigate to bank configuration page
    // TODO: Click add account
    // TODO: Enter account name and select stock unit type
    // TODO: Submit form
    // TODO: Verify account appears with stock unit
  });

  test('edits account details', async () => {
    // TODO: Create user with bank and account via seed
    // TODO: Log in
    // TODO: Navigate to bank configuration page
    // TODO: Click edit on the account
    // TODO: Change account name
    // TODO: Save changes
    // TODO: Verify updated name is displayed
  });

  test('archives an account', async () => {
    // TODO: Create user with bank and account via seed
    // TODO: Log in
    // TODO: Navigate to bank configuration page
    // TODO: Archive the account
    // TODO: Verify account is marked as archived
    // TODO: Verify archived account is hidden from transaction forms
  });

  test('configures joint account', async () => {
    // TODO: Create user with bank and account via seed
    // TODO: Log in
    // TODO: Navigate to account settings
    // TODO: Enable joint account
    // TODO: Save changes
    // TODO: Verify overview page shows own half of the account balance
  });
});
