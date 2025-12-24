import {type Page, type Locator, expect} from '@playwright/test';

export class OverviewPage {
  readonly page: Page;
  readonly balanceSection: Locator;
  readonly expenseSection: Locator;
  readonly incomeSection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.balanceSection = page.getByRole('region', {
      name: 'Your total balance',
    });
    this.expenseSection = page.getByRole('region', {
      name: 'Expense',
    });
    this.incomeSection = page.getByRole('region', {
      name: 'Income',
    });
  }

  async goto() {
    await this.page.goto('/overview');
  }

  async expectBalance(amount: string) {
    await expect(this.balanceSection).toContainText(amount);
  }

  async expectExpense(amount: string) {
    await expect(this.expenseSection).toContainText(amount);
  }

  async expectIncome(amount: string) {
    await expect(this.incomeSection).toContainText(amount);
  }
}
