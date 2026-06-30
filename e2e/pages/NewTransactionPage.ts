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

  // goto opens the new transaction page and waits for the suggestion drafts to
  // load, so the panel's presence (or absence) can be asserted without racing
  // the request that populates it.
  async goto() {
    await Promise.all([
      this.page.waitForResponse(r => r.url().includes('/api/suggest')),
      this.page.goto('/new'),
    ]);
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

  async expectVisible() {
    await expect(this.heading).toBeVisible();
  }

  // expectAbsent asserts the suggestion panel does not appear, e.g. when the
  // connected account has no fetched transactions to propose.
  async expectAbsent() {
    await expect(this.heading).toBeHidden();
  }

  // expectFetchStatus asserts the open banking sync status note contains the given text.
  async expectFetchStatus(text: string) {
    await expect(
      this.page.getByTestId('open-banking-fetch-status')
    ).toContainText(text);
  }
}
