import {type Locator, type Page, expect} from '@playwright/test';

export class MonthlyStatsPage {
  readonly page: Page;
  readonly summaryList: Locator;

  constructor(page: Page) {
    this.page = page;
    // The PeriodSummary component renders a <ul> with text-lg class
    this.summaryList = page.locator('ul.text-lg');
  }

  async goto() {
    await this.page.goto('/stats/monthly');
  }

  async expectSpentAmount(amount: string) {
    await expect(this.summaryList.getByText(`Spent: ${amount}`)).toBeVisible();
  }

  async expectReceivedAmount(amount: string) {
    await expect(
      this.summaryList.getByText(`Received: ${amount}`)
    ).toBeVisible();
  }

  async expectDeltaAmount(amount: string) {
    await expect(this.summaryList.getByText(`Delta: ${amount}`)).toBeVisible();
  }

  async expectExpenseCount(count: number) {
    await expect(
      this.page.getByRole('heading', {name: `Expenses (${count})`})
    ).toBeVisible();
  }

  async expectIncomeCount(count: number) {
    await expect(
      this.page.getByRole('heading', {name: `Income (${count})`})
    ).toBeVisible();
  }

  async selectMonth(monthLabel: string) {
    // Navigation buttons are rendered as <button> elements with the month name
    await this.page
      .getByRole('button', {name: monthLabel, exact: true})
      .click();
  }

  async expectMonthSelected(monthLabel: string) {
    // Selected month button is disabled
    const button = this.page.getByRole('button', {
      name: monthLabel,
      exact: true,
    });
    await expect(button).toBeDisabled();
  }

  async expectTransactionVisible(description: string) {
    await expect(this.page.getByText(description)).toBeVisible();
  }

  async expectTransactionNotVisible(description: string) {
    await expect(this.page.getByText(description)).not.toBeVisible();
  }
}
