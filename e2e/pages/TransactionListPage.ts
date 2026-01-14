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
    // Wait for the search input to be visible to ensure page is fully loaded
    await this.searchInput.waitFor({state: 'visible'});
  }

  async search(query: string) {
    await this.searchInput.fill(query);
  }

  async toggleStats() {
    await this.page.getByRole('button', {name: 'Stats'}).click();
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

  async expectTransactionHasNote(text: string, expectedNote: string) {
    const listItem = this.getTransactionListItem(text);
    await this.ensureExpanded(listItem);
    await expect(listItem.getByText(`Note: ${expectedNote}`)).toBeVisible();
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

  async expectTransactionShowsRefundFor(
    transactionText: string,
    refundedExpenseVendor: string
  ) {
    const listItem = this.getTransactionListItem(transactionText);
    await this.ensureExpanded(listItem);
    await expect(
      listItem.getByText('This transaction is a refund for')
    ).toBeVisible();
    // The refund details show "vendor on date" format
    const refundPattern = new RegExp(
      `^${refundedExpenseVendor} on \\d{4}-\\d{2}-\\d{2}$`
    );
    await expect(listItem.getByText(refundPattern)).toBeVisible();
  }

  async expectTransactionWasRefundedIn(
    expenseVendor: string,
    refundPayer: string
  ) {
    const listItem = this.getTransactionListItem(expenseVendor);
    await this.ensureExpanded(listItem);
    await expect(
      listItem.getByText('This expense was refunded in')
    ).toBeVisible();
    await expect(listItem.getByText(refundPayer)).toBeVisible();
  }

  async expectTransactionShowsRepaymentFor(
    transactionText: string,
    thirdPartyExpenseVendor: string,
    payer: string
  ) {
    const listItem = this.getTransactionListItem(transactionText);
    await this.ensureExpanded(listItem);
    await expect(
      listItem.getByText('This transaction is a repayment for')
    ).toBeVisible();
    await expect(listItem.getByText(thirdPartyExpenseVendor)).toBeVisible();
    await expect(listItem.getByText(`paid by ${payer}`)).toBeVisible();
  }

  async expectTransactionWasRepaidIn(
    thirdPartyExpenseVendor: string,
    repaymentVendor: string
  ) {
    const listItem = this.getTransactionListItem(thirdPartyExpenseVendor);
    await this.ensureExpanded(listItem);
    await expect(
      listItem.getByText('This expense was repaid in')
    ).toBeVisible();
    await expect(listItem.getByText(repaymentVendor)).toBeVisible();
  }

  async expectThirdPartyExpenseIndicator(vendor: string, payer: string) {
    const listItem = this.getTransactionListItem(vendor);
    // The third-party expense shows "paid by [payer]" in the title
    await expect(listItem.getByText(`paid by ${payer}`)).toBeVisible();
  }

  // Ensures a transaction list item is in expanded state.
  // If already expanded, does nothing. If collapsed, clicks to expand.
  private async ensureExpanded(listItem: Locator) {
    const editButton = listItem.getByRole('button', {name: 'Edit'});
    const isExpanded = await editButton.isVisible();
    if (!isExpanded) {
      // Scroll into view first, then click. The click handler is on the child div.
      await listItem.scrollIntoViewIfNeeded();
      await listItem.locator('> div').first().click();
      await expect(editButton).toBeVisible();
    }
  }
}
