import {type Locator, type Page, expect} from '@playwright/test';

export class OverviewPage {
  readonly page: Page;
  readonly totalBalance: Locator;

  constructor(page: Page) {
    this.page = page;
    this.totalBalance = page.getByRole('region', {
      name: 'Your total balance',
    });
  }

  async goto() {
    await this.page.goto('/overview');
  }

  async expectTotalBalance(amount: string) {
    await expect(this.totalBalance).toContainText(amount);
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
