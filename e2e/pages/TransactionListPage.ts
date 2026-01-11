import {type Locator, type Page, expect} from '@playwright/test';
import {TransactionForm} from './TransactionForm';

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
    const listItem = this.getTransactionListItem(text);
    await this.ensureExpanded(listItem);
  }

  async openEditForm(text: string) {
    const listItem = this.getTransactionListItem(text);
    await this.ensureExpanded(listItem);
    await listItem.getByRole('button', {name: 'Edit'}).click();
    // The edit form is not inside the list item, but inside a dialog.
    const form = this.page.getByRole('dialog').locator('form');
    return new TransactionForm(form);
  }

  async expectTransactionHasTags(text: string, expectedTags: string[]) {
    const listItem = this.getTransactionListItem(text);
    await this.ensureExpanded(listItem);
    const tagsSection = listItem.getByText(/^Tags:/);
    await expect(tagsSection).toBeVisible();
    // Parse "Tags: tag1, tag2, tag3" into ['tag1', 'tag2', 'tag3']
    const textContent = await tagsSection.textContent();
    const actual =
      textContent
        ?.replace(/^Tags:\s*/, '')
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)
        .sort() || [];
    expect(actual).toEqual([...expectedTags].sort());
  }

  // Ensures a transaction list item is in expanded state.
  // If already expanded, does nothing. If collapsed, clicks to expand.
  private async ensureExpanded(listItem: Locator) {
    const editButton = listItem.getByRole('button', {name: 'Edit'});
    const isExpanded = await editButton.isVisible();
    if (!isExpanded) {
      await listItem.click();
      await expect(editButton).toBeVisible();
    }
  }
}
