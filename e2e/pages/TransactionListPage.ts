import {type Locator, type Page, expect} from '@playwright/test';

export class TransactionListPage {
  readonly page: Page;
  readonly searchInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByLabel('Search For Anything');
  }

  async goto() {
    await this.page.goto('/transactions');
  }

  async search(query: string) {
    await this.searchInput.fill(query);
  }

  getTransactionListItem(text: string) {
    return this.page.getByRole('listitem').filter({hasText: text});
  }

  getAllTransactionListItems() {
    return this.page.getByRole('listitem');
  }

  async expandTransaction(text: string) {
    await this.getTransactionListItem(text).click();
  }

  async clickEditTransaction(text: string) {
    const item = this.getTransactionListItem(text);
    await item.click();
    await item.getByRole('button', {name: 'Edit'}).click();
  }

  async expectExpandedTransactionHasTags(
    transactionText: string,
    expected: string[]
  ) {
    // TODO: check the transaction is expanded
    const transaction = this.getTransactionListItem(transactionText);
    // Text list of tags in format "Tags: tag1, tag2, tag3"
    const textContent = await transaction.getByText(/^Tags:/).textContent();
    // Parse the comma-separated string into an array.
    // Input: "Tags: tag1, tag2, tag3" -> Output: ['tag1', 'tag2', 'tag3']
    const actual =
      textContent
        ?.replace(/^Tags:\s*/, '') // Remove "Tags: " prefix
        .split(',')
        .map(t => t.trim())
        .filter(Boolean) // Remove empty strings
        .sort() || []; // Sort for comparison
    // compare ignoring order
    expect(actual).toEqual([...expected].sort());
  }
}
