import {type Locator, type Page, expect} from '@playwright/test';

export class YearlyStatsPage {
  readonly page: Page;
  readonly summaryList: Locator;

  constructor(page: Page) {
    this.page = page;
    // The PeriodSummary component renders a <ul> with text-lg class
    this.summaryList = page.locator('ul.text-lg');
  }

  async goto() {
    await this.page.goto('/stats/yearly');
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

  async selectYear(yearLabel: string) {
    // Navigation buttons are rendered as <button> elements with the year
    await this.page.getByRole('button', {name: yearLabel, exact: true}).click();
  }

  async expectYearSelected(yearLabel: string) {
    // Selected year button is disabled
    const button = this.page.getByRole('button', {
      name: yearLabel,
      exact: true,
    });
    await expect(button).toBeDisabled();
  }
}
