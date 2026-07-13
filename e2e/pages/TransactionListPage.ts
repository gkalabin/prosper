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
    await this.expectDetail(listItem, 'Category', category);
  }

  async expectTransactionHasTags(text: string, expectedTags: string[]) {
    const listItem = this.getTransactionListItem(text);
    await this.ensureExpanded(listItem);
    const tags = listItem
      .getByRole('list', {name: 'Tags'})
      .getByRole('listitem');
    await expect(tags).toHaveCount(expectedTags.length);
    const actual = await tags.allTextContents();
    expect(actual.sort()).toEqual([...expectedTags].sort());
  }

  async expectExpenseTransaction(
    text: string,
    {
      amount,
      vendor,
      account,
      category,
      refundedIn,
    }: {
      amount: string;
      vendor: string;
      account: string;
      category: string;
      refundedIn?: string[];
    }
  ) {
    const item = this.getTransactionListItem(text);
    await this.ensureExpanded(item);
    await this.expectDetail(item, 'Full amount', amount);
    await this.expectDetail(item, 'Vendor', vendor);
    await this.expectDetail(item, 'Account', account);
    await this.expectDetail(item, 'Category', category);
    if (refundedIn) {
      const refunds = item.getByText('Refunded in');
      await expect(refunds).toBeVisible();
      for (const r of refundedIn) {
        await expect(
          refunds.getByRole('listitem').filter({hasText: r})
        ).toBeVisible();
      }
    }
  }

  async expectIncomeTransaction(
    text: string,
    {
      amount,
      payer,
      account,
      category,
      refundForVendor,
    }: {
      amount: string;
      payer: string;
      account: string;
      category: string;
      refundForVendor?: string;
    }
  ) {
    const item = this.getTransactionListItem(text);
    await this.ensureExpanded(item);
    await this.expectDetail(item, 'Full amount', amount);
    await this.expectDetail(item, 'Payer', payer);
    await this.expectDetail(item, 'Account', account);
    await this.expectDetail(item, 'Category', category);
    if (refundForVendor) {
      await expect(
        item.getByText(`Refund for ${refundForVendor}`)
      ).toBeVisible();
    }
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
    await this.expectDetail(item, 'Sent', amountSent);
    await this.expectDetail(item, 'Received', amountReceived);
    await this.expectDetail(item, 'From', accountFrom);
    await this.expectDetail(item, 'To', accountTo);
    await this.expectDetail(item, 'Category', category);
  }

  async expectThirdPartyTransaction(
    text: string,
    {
      fullAmount,
      ownShare,
      vendor,
      category,
      payer,
    }: {
      fullAmount: string;
      ownShare: string;
      vendor: string;
      category: string;
      payer: string;
    }
  ) {
    const item = this.getTransactionListItem(text);
    await this.ensureExpanded(item);
    await this.expectDetail(item, 'Paid by', payer);
    await this.expectDetail(item, 'Full amount', fullAmount);
    await this.expectDetail(item, 'Own share', ownShare);
    await this.expectDetail(item, 'Vendor', vendor);
    await this.expectDetail(item, 'Category', category);
  }

  async expectExpenseTransactionNotRefunded(text: string) {
    const item = this.getTransactionListItem(text);
    await this.ensureExpanded(item);
    await expect(item.getByText('Refunded in')).not.toBeVisible();
  }

  async expectIncomeTransactionIsNotRefund(text: string) {
    const item = this.getTransactionListItem(text);
    await this.ensureExpanded(item);
    await expect(item.getByText('Refund for')).not.toBeVisible();
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

  // Asserts the expanded detail panel defines the given term with the value.
  private async expectDetail(item: Locator, label: string, value: string) {
    const term = item
      .getByRole('term')
      .filter({hasText: new RegExp(`^${label}$`)});
    // In a description list the value is the definition following its term.
    await expect(term.locator('+ dd')).toContainText(value);
  }

  // Ensures a transaction list item is in expanded state.
  // If already expanded, does nothing. If collapsed, clicks to expand.
  private async ensureExpanded(listItem: Locator) {
    const collapsedTrigger = listItem.getByRole('button', {expanded: false});
    if (await collapsedTrigger.isVisible()) {
      await collapsedTrigger.click();
    }
    await expect(listItem.getByRole('button', {expanded: true})).toBeVisible();
  }
}
