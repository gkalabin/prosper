import {type Locator, type Page, expect} from '@playwright/test';
import {TransactionForm} from './TransactionForm';

export class NewTransactionPage {
  readonly page: Page;
  readonly form: TransactionForm;
  readonly suggestions: SuggestionList;

  constructor(page: Page) {
    this.page = page;
    this.form = new TransactionForm(page.locator('form'));
    this.suggestions = new SuggestionList(page);
  }

  async goto() {
    await this.page.goto('/new');
  }
}

// SuggestionList drives the open banking suggestion panel shown above the new transaction form.
export class SuggestionList {
  readonly page: Page;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', {name: 'Suggestions'});
  }

  // selectAccount switches the panel to the account whose suggestions should be shown;
  async selectAccount(accountName: string) {
    await this.page.getByRole('button', {name: accountName}).click();
  }

  async click(description: string) {
    const item = this.page.getByText(description, {exact: true});
    await expect(item).toBeVisible();
    await item.click();
  }
}
