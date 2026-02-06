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

  async expectTransactionHasCategory(text: string, category: string) {
    const listItem = this.getTransactionListItem(text);
    await this.ensureExpanded(listItem);
    await expect(listItem.getByText(`Category: ${category}`)).toBeVisible();
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

  async expectTransferTransaction(
    text: string,
    {
      amountSent,
      amountReceived,
      accountFrom,
      accountTo,
      category,
    }: {
      amountSent: string;
      amountReceived: string;
      accountFrom: string;
      accountTo: string;
      category: string;
    }
  ) {
    const item = this.getTransactionListItem(text);
    await this.ensureExpanded(item);
    await expect(item.getByText(`Sent: ${amountSent}`)).toBeVisible();
    await expect(item.getByText(`Received: ${amountReceived}`)).toBeVisible();
    await expect(item.getByText(`Account from: ${accountFrom}`)).toBeVisible();
    await expect(item.getByText(`Account to: ${accountTo}`)).toBeVisible();
    await expect(item.getByText(`Category: ${category}`)).toBeVisible();
  }

  async openStats() {
    await this.page.getByRole('button', {name: 'Stats'}).click();
  }

  expenseSection() {
    return this.page.getByRole('region', {name: 'Expense'});
  }

  incomeSection() {
    return this.page.getByRole('region', {name: 'Income'});
  }

  async expectTotalExpenseToBe(total: string) {
    await expect(
      this.expenseSection().getByText('Total: ' + total)
    ).toBeVisible();
  }

  async expectMonthlyNetExpenseChartAmounts(expectedAmounts: number[]) {
    const chart = this.expenseSection().locator(
      `[data-chart-title="Monthly spent net (own share)"]`
    );
    const valuesAttr = await chart.getAttribute('data-chart-values');
    if (!valuesAttr) {
      throw new Error('Chart values not found');
    }
    const chartData = JSON.parse(valuesAttr) as number[];
    expect(chartData).toEqual(expectedAmounts);
  }

  async expectExpensesNetMonthlyPercentiles(expected: {
    p25: string;
    p50: string;
    p75: string;
    max: string;
  }) {
    const section = this.expenseSection().getByRole('region', {
      name: 'Monthly percentiles (net)',
    });
    await expect(section).toBeVisible();
    const definition = (name: string) =>
      section.getByRole('listitem').filter({hasText: name});
    await expect(definition('p25')).toContainText(expected.p25);
    await expect(definition('p50')).toContainText(expected.p50);
    await expect(definition('p75')).toContainText(expected.p75);
    await expect(definition('max')).toContainText(expected.max);
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
