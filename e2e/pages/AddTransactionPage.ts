import {type Page, type Locator, expect} from '@playwright/test';
import {format} from 'date-fns';

export class AddTransactionPage {
  readonly page: Page;
  readonly expenseTab: Locator;
  readonly amountInput: Locator;
  readonly dateInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.expenseTab = page.getByRole('tab', {name: 'Expense'});
    this.amountInput = page.getByLabel('Amount');
    this.dateInput = page.getByLabel('Time');
    this.submitButton = page.getByRole('button', {name: 'Add'});
  }

  async goto() {
    await this.page.goto('/new');
  }

  async addExpense(amount: number, datetime: Date) {
    await this.amountInput.waitFor({state: 'visible'});
    await this.amountInput.fill(String(amount));
    const formattedDatetime = format(datetime, "yyyy-MM-dd'T'HH:mm");
    await this.dateInput.fill(formattedDatetime);
    await this.submitButton.click();
    // Wait until the button goes back to 'Add' from 'Adding...'
    await expect(this.submitButton).toHaveText('Add');
  }
}
