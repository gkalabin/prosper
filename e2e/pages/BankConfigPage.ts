import {type Locator, type Page, expect} from '@playwright/test';

export class BankConfigPage {
  readonly page: Page;
  readonly addNewBankButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addNewBankButton = page.getByRole('button', {name: 'Add New Bank'});
  }

  async goto() {
    await this.page.goto('/config/banks');
  }

  getBankSection(bankName: string) {
    return this.page.getByRole('region', {name: bankName});
  }

  async createBank(name: string) {
    await this.addNewBankButton.click();
    // The bank form appears after clicking the add bank button.
    const bankForm = this.page.locator('form');
    await bankForm.getByLabel('Bank Name').fill(name);
    const addBankButton = bankForm.getByRole('button', {name: 'Add'});
    await addBankButton.click();
    // Wait for the bank form to disappear, indicating creation completed.
    await expect(bankForm).not.toBeVisible();
  }

  async editBank({
    currentName,
    newName,
  }: {
    currentName: string;
    newName: string;
  }) {
    const bankSection = this.getBankSection(currentName);
    await bankSection.getByRole('button', {name: 'Edit'}).click();
    // The bank form appears after clicking the edit button.
    const bankForm = bankSection.locator('form');
    await bankForm.getByLabel('Bank Name').fill(newName);
    const updateButton = bankForm.getByRole('button', {name: 'Update'});
    await updateButton.click();
    // Clicking update submits the form which hides when the update completes.
    // Wait for the form to disappear meaning the operation has completed.
    await expect(bankForm).not.toBeVisible();
  }

  async createAccount({
    bankName,
    accountName,
    currency,
    balance,
  }: {
    bankName: string;
    accountName: string;
    currency: string;
    balance: number;
  }) {
    const bankSection = this.getBankSection(bankName);
    await bankSection.getByRole('button', {name: 'Add New Account'}).click();
    // The account form appears after clicking the add account button.
    const accountForm = bankSection.locator('form');
    await accountForm.getByLabel('Bank Account Name').fill(accountName);
    // Select currency using the accessible combobox name.
    await accountForm
      .getByRole('combobox', {name: 'Account currency or stock'})
      .click();
    // TODO: remove first?
    await this.page.getByRole('option', {name: currency}).first().click();
    await accountForm.getByLabel('Initial balance').fill(balance.toString());
    const addAccountButton = accountForm.getByRole('button', {name: 'Add'});
    await addAccountButton.click();
    // Wait for the account form to disappear, indicating creation completed.
    await expect(accountForm).not.toBeVisible();
  }

  async editAccount({
    bankName,
    currentAccountName,
    newAccountName,
    newArchivedState,
  }: {
    bankName: string;
    currentAccountName: string;
    newAccountName?: string;
    newArchivedState?: boolean;
  }) {
    const bankSection = this.getBankSection(bankName);
    const editButton = bankSection.getByRole('button', {
      name: `Edit ${currentAccountName}`,
    });
    await editButton.click();
    const accountForm = bankSection.locator('form');
    if (newAccountName != undefined) {
      await accountForm.getByLabel('Bank Account Name').fill(newAccountName);
    }
    if (newArchivedState != undefined) {
      const archivedCheckbox = accountForm.getByLabel('Archived account');
      await archivedCheckbox.setChecked(newArchivedState);
    }
    const updateButton = accountForm.getByRole('button', {name: 'Update'});
    await updateButton.click();
    // Wait for the form to disappear indicating the update completed.
    await expect(accountForm).not.toBeVisible();
  }
}
