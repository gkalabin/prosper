import {type Locator, type Page, expect} from '@playwright/test';

export class IncomeStatsPage {
  readonly page: Page;
  readonly monthlyIncomeChartWrapper: Locator;
  readonly yearlyIncomeChartWrapper: Locator;
  readonly durationSelector: Locator;

  constructor(page: Page) {
    this.page = page;
    this.monthlyIncomeChartWrapper = page.locator(
      `[data-chart-title="Monthly income"]`
    );
    this.yearlyIncomeChartWrapper = page.locator(
      `[data-chart-title="Yearly income"]`
    );
    this.durationSelector = this.page.getByRole('button', {name: /Duration:/});
  }

  async goto() {
    await this.page.goto('/stats/income');
    // Wait for the duration selector to be visible to ensure page is loaded
    await this.durationSelector.waitFor({state: 'visible'});
  }

  async expectMonthlyChartVisible() {
    const chart = this.monthlyIncomeChartWrapper.locator('canvas');
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
    const chartData = await this.getChartData(this.monthlyIncomeChartWrapper);
    expect(chartData).toEqual(expectedAmounts);
  }

  async selectDuration(label: string) {
    // Wait for the duration selector button to be ready
    await this.durationSelector.waitFor({state: 'visible'});
    await this.durationSelector.click();
    const durationOption = this.page.getByRole('button', {
      name: label,
      exact: true,
    });
    // Wait with longer timeout for dropdown options to appear
    await durationOption.waitFor({state: 'visible', timeout: 10000});
    await durationOption.click();
  }

  async expectYearlyChartVisible() {
    const chart = this.yearlyIncomeChartWrapper.locator('canvas');
    await expect(chart).toBeVisible();
  }

  async expectYearlyChartAmounts(expectedAmounts: number[]) {
    const chartData = await this.getChartData(this.yearlyIncomeChartWrapper);
    expect(chartData).toEqual(expectedAmounts);
  }
}
