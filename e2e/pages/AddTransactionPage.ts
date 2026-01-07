import {type Locator, type Page, expect} from '@playwright/test';
import {format} from 'date-fns';

export class AddTransactionPage {
  readonly page: Page;
  readonly expenseTab: Locator;
  readonly amountInput: Locator;
  readonly dateInput: Locator;
  readonly vendorInput: Locator;
  readonly categoryField: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.expenseTab = page.getByRole('tab', {name: 'Expense'});
    this.amountInput = page.getByLabel('Amount');
    this.dateInput = page.getByLabel('Time');
    this.vendorInput = page.getByLabel('Vendor');
    this.categoryField = page.getByRole('combobox', {name: 'Category'});
    this.submitButton = page.getByRole('button', {name: 'Add'});
  }

  async goto() {
    await this.page.goto('/new');
  }

  async selectCategory(category: string) {
    await this.categoryField.click();
    await this.page.getByRole('option', {name: category}).first().click();
  }

  async addExpense(options: {
    amount: number;
    datetime: Date;
    vendor: string;
    category: string;
  }) {
    await this.amountInput.waitFor({state: 'visible'});
    await this.amountInput.fill(String(options.amount));
    const formattedDatetime = format(options.datetime, "yyyy-MM-dd'T'HH:mm");
    await this.dateInput.fill(formattedDatetime);
    await this.vendorInput.fill(options.vendor);
    await this.selectCategory(options.category);
    await this.submitButton.click();
    // Wait until the button goes back to 'Add' from 'Adding...'
    await expect(this.submitButton).toHaveText('Add');
  }
}
