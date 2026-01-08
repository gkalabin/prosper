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
    // Clicking add submits the form and makes the button disabled.
    // Wait for the submission to complete when the button is enabled again.
    await expect(addBankButton).toBeEnabled();
  }

  async createAccount(
    bankName: string,
    accountName: string,
    currency: string,
    balance: number
  ) {
    const bankSection = this.getBankSection(bankName);
    await bankSection.getByRole('button', {name: 'Add New Account'}).click();
    // The account form appears after clicking the add account button.
    const accountForm = bankSection.locator('form');
    await accountForm.getByLabel('Bank Account Name').fill(accountName);
    // Select currency - locate the field by its label text, then get the combobox within
    // TODO: do not use div locator as it is relying on implementation details that the form uses div.
    const currencyField = accountForm.locator('div', {
      has: this.page.getByText('Account currency or stock', {exact: true}),
    });
    await currencyField.getByRole('combobox').click();
    await this.page.getByRole('option', {name: currency}).click();
    await accountForm.getByLabel('Initial balance').fill(balance.toString());
    const addAccountButton = accountForm.getByRole('button', {name: 'Add'});
    await addAccountButton.click();
    // Clicking add submits the form and makes the button disabled.
    // Wait for the submission to complete when the button is enabled again.
    await expect(addAccountButton).toBeEnabled();
  }
}
