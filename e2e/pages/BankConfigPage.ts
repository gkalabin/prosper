import {type Page, type Locator, expect} from '@playwright/test';

export class BankConfigPage {
  readonly page: Page;
  readonly addNewBankButton: Locator;
  readonly saveBankButton: Locator;
  readonly bankNameInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addNewBankButton = page.getByRole('button', {name: 'Add New Bank'});
    this.saveBankButton = page.getByRole('button', {name: 'Add'});
    this.bankNameInput = page.getByLabel('Bank Name');
  }

  async goto() {
    await this.page.goto('/config/banks');
  }

  async createBank(name: string) {
    await this.addNewBankButton.click();
    await this.bankNameInput.fill(name);
    await this.saveBankButton.click();
    await expect(this.page.getByText(name, {exact: true})).toBeVisible();
  }

  async createAccount(
    bankName: string,
    accountName: string,
    currency: string,
    balance: number
  ) {
    const bankSection = this.page.getByRole('region', {name: bankName});
    await bankSection.getByRole('button', {name: 'Add New Account'}).click();
    // The account form appears.
    const accountForm = bankSection.locator('form');
    await accountForm.getByLabel('Bank Account Name').fill(accountName);

    // Select currency - locate the field by its label text, then get the combobox within
    const currencyField = accountForm.locator('div', {
      has: this.page.getByText('Account currency or stock', {exact: true}),
    });
    await currencyField.getByRole('combobox').click();
    await this.page.getByRole('option', {name: currency}).click();

    await accountForm.getByLabel('Initial balance').fill(balance.toString());
    await accountForm.getByRole('button', {name: 'Add'}).click();
    // Form submission is in progress now, wait for the account to appear.
    await expect(bankSection.getByText(accountName)).toBeVisible();
  }
}
