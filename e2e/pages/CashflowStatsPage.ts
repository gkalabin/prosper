import {type Locator, type Page, expect} from '@playwright/test';

export class CashflowStatsPage {
  readonly page: Page;
  readonly monthlyCashflowChartWrapper: Locator;
  readonly monthlyIncomeChartWrapper: Locator;
  readonly monthlyExpenseChartWrapper: Locator;
  readonly durationSelector: Locator;

  constructor(page: Page) {
    this.page = page;
    this.monthlyCashflowChartWrapper = page.locator(
      `[data-chart-title="Monthly cashflow"]`
    );
    this.monthlyIncomeChartWrapper = page.locator(
      `[data-chart-title="Monthly income"]`
    );
    this.monthlyExpenseChartWrapper = page.locator(
      `[data-chart-title="Monthly spend"]`
    );
    this.durationSelector = this.page.getByRole('button', {name: /Duration:/});
  }

  async goto() {
    await this.page.goto('/stats/cashflow');
  }

  async getChartData(chartWrapper: Locator): Promise<number[]> {
    const valuesAttr = await chartWrapper.getAttribute('data-chart-values');
    if (!valuesAttr) {
      throw new Error('Chart values not found');
    }
    return JSON.parse(valuesAttr) as number[];
  }

  async expectMonthlyCashflowChartVisible() {
    const chart = this.monthlyCashflowChartWrapper.locator('canvas');
    await expect(chart).toBeVisible();
  }

  async expectMonthlyCashflowAmounts(expectedAmounts: number[]) {
    const chartData = await this.getChartData(this.monthlyCashflowChartWrapper);
    expect(chartData).toEqual(expectedAmounts);
  }

  async expectMonthlyIncomeAmounts(expectedAmounts: number[]) {
    const chartData = await this.getChartData(this.monthlyIncomeChartWrapper);
    expect(chartData).toEqual(expectedAmounts);
  }

  async expectMonthlyExpenseAmounts(expectedAmounts: number[]) {
    const chartData = await this.getChartData(this.monthlyExpenseChartWrapper);
    expect(chartData).toEqual(expectedAmounts);
  }

  async selectDuration(label: string) {
    await this.durationSelector.click();
    await this.page.getByRole('button', {name: label, exact: true}).click();
  }
}
