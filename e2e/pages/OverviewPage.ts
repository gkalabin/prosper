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
    // If bank has no visible accounts, the bank card itself may not be visible
    // Either the bank card is not visible, or it's visible but the account is not
    const isBankVisible = await bankCard.isVisible();
    if (isBankVisible) {
      await expect(bankCard.getByText(accountName)).not.toBeVisible();
    }
    // If bank is not visible, that's also fine - the account isn't visible either
  }

  // TODO: change signature to {bankName: string; accountName: string}
  async clickAccount(accountName: string) {
    // TODO: locate the account WITHIN the bank card.
    await this.page.getByText(accountName).click();
  }

  async expectAccountBalance(
    bankName: string,
    accountName: string,
    balance: string
  ) {
    const bankCard = this.getBankCard(bankName);
    const accountItem = bankCard.getByText(accountName).locator('..');
    await expect(accountItem).toContainText(balance);
  }
}
