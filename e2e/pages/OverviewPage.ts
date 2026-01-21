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

  getBankCard(bankName: string) {
    return this.page.getByRole('region', {name: bankName});
  }

  async expectBankWithAccounts(bankName: string, accountNames: string[]) {
    const bankCard = this.getBankCard(bankName);
    await expect(bankCard).toBeVisible();
    for (const accountName of accountNames) {
      await expect(bankCard.getByText(accountName)).toBeVisible();
    }
  }

  async expectAccountNotVisible(bankName: string, accountName: string) {
    const bankCard = this.getBankCard(bankName);
    await expect(bankCard.getByText(accountName)).not.toBeVisible();
  }
}
