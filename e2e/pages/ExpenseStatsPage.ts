import {type Locator, type Page, expect} from '@playwright/test';

export class ExpenseStatsPage {
  readonly page: Page;
  readonly monthlySpendChartWrapper: Locator;
  readonly yearlySpendChartWrapper: Locator;
  readonly durationSelector: Locator;

  constructor(page: Page) {
    this.page = page;
    this.monthlySpendChartWrapper = page.locator(
      `[data-chart-title="Monthly spend"]`
    );
    this.yearlySpendChartWrapper = page.locator(
      `[data-chart-title="Yearly spend"]`
    );
    this.durationSelector = this.page.getByRole('button', {name: /Duration:/});
  }

  async goto() {
    await this.page.goto('/stats/expense');
  }

  async expectMonthlyChartVisible() {
    const chart = this.monthlySpendChartWrapper.locator('canvas');
    await expect(chart).toBeVisible();
  }

  async getChartData(chartWrapper: Locator): Promise<number[]> {
    const valuesAttr = await chartWrapper.getAttribute('data-chart-values');
    if (!valuesAttr) {
      throw new Error('Chart values not found');
    }
    return JSON.parse(valuesAttr) as number[];
  }

  async expectMonthlyChartAmounts(expectedAmounts: number[]) {
    const chartData = await this.getChartData(this.monthlySpendChartWrapper);
    expect(chartData).toEqual(expectedAmounts);
  }

  async selectDuration(label: string) {
    await this.durationSelector.click();
    await this.page.getByRole('button', {name: label, exact: true}).click();
  }

  async expectYearlyChartVisible() {
    const chart = this.yearlySpendChartWrapper.locator('canvas');
    await expect(chart).toBeVisible();
  }

  async expectYearlyChartAmounts(expectedAmounts: number[]) {
    const chartData = await this.getChartData(this.yearlySpendChartWrapper);
    expect(chartData).toEqual(expectedAmounts);
  }
}
