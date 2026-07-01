import {type Locator, type Page, expect} from '@playwright/test';

export class OverviewPage {
  readonly page: Page;
  readonly totalBalance: Locator;
  readonly rangeStartAmount: Locator;
  readonly rangeEndAmount: Locator;

  constructor(page: Page) {
    this.page = page;
    this.totalBalance = page.getByRole('region', {
      name: 'Net worth',
    });
    this.rangeStartAmount = page.getByTestId('net-worth-range-start');
    this.rangeEndAmount = page.getByTestId('net-worth-range-end');
  }

  async goto() {
    await this.page.goto('/overview');
  }

  // Picks the net worth chart time range by its accessible label,
  // e.g. '6 months'.
  async selectNetWorthRange(label: string) {
    await this.page
      .getByRole('tablist', {name: 'Net worth time range'})
      .getByRole('tab', {name: label, exact: true})
      .click();
  }

  async expectTotalBalance(amount: string) {
    await expect(this.totalBalance).toContainText(amount);
  }

  // The net worth chart is flanked by its range endpoints:
  // the net worth at the start of the selected range and the net worth today.
  async expectRangeAmounts(start: string, end: string) {
    await expect(this.rangeStartAmount).toContainText(start);
    await expect(this.rangeEndAmount).toContainText(end);
  }

  private getBankCard(bankName: string) {
    return this.page.getByRole('region', {name: bankName});
  }

  private getAccountItem(bankCard: Locator, accountName: string) {
    return bankCard
      .getByRole('listitem')
      .filter({has: this.page.getByText(accountName, {exact: true})});
  }

  async expectBankWithAccounts(bankName: string, accountNames: string[]) {
    const bankCard = this.getBankCard(bankName);
    await expect(bankCard).toBeVisible();
    for (const accountName of accountNames) {
      await expect(this.getAccountItem(bankCard, accountName)).toBeVisible();
    }
  }

  async expectAccountNotVisible(bankName: string, accountName: string) {
    const bankCard = this.getBankCard(bankName);
    // If bank has no visible accounts, the bank card itself may not be visible.
    // Either the bank card is not visible, or it's visible but the account is not.
    const isBankVisible = await bankCard.isVisible();
    if (!isBankVisible) {
      return;
    }
    await expect(this.getAccountItem(bankCard, accountName)).not.toBeVisible();
  }

  async expectAccountBalance(
    bankName: string,
    accountName: string,
    balance: string
  ) {
    const bankCard = this.getBankCard(bankName);
    const accountItem = this.getAccountItem(bankCard, accountName);
    await expect(accountItem).toContainText(balance);
  }
}
