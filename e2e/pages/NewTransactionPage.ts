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

// SuggestionList drives the open banking suggestion panel shown above the new
// transaction form. Each suggestion is keyed by the description the provider
// reported; clicking one pre-fills the form.
export class SuggestionList {
  readonly page: Page;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', {name: 'Suggestions'});
  }

  // selectAccount switches the panel to the account whose suggestions should
  // be shown, identified by its full "Bank: Account" name.
  async selectAccount(fullAccountName: string) {
    await this.page.getByRole('button', {name: fullAccountName}).click();
  }

  item(description: string): Locator {
    return this.page.getByText(description, {exact: true});
  }

  async click(description: string) {
    const item = this.item(description);
    await expect(item).toBeVisible();
    await item.click();
  }
}
