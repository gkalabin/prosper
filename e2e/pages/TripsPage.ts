import {type Locator, type Page, expect} from '@playwright/test';

export class TripsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/trips');
  }

  getTripLink(tripName: string): Locator {
    // The trip link text contains trip name + total, match by text containing trip name
    return this.page.getByRole('link', {name: new RegExp(tripName)});
  }

  async gotoTrip(tripName: string) {
    // Navigate to trips list first, then click the trip link
    await this.goto();
    // Wait for the link to be visible and click it
    const link = this.getTripLink(tripName);
    await expect(link).toBeVisible();
    await link.click();
    // Wait for navigation to complete by checking URL contains trip name
    await this.page.waitForURL(`**/trips/${tripName}`, {timeout: 10000});
    await expect(
      this.page.getByRole('heading', {name: tripName, level: 1})
    ).toBeVisible();
  }

  async gotoTripByUrl(tripName: string) {
    await this.page.goto(`/trips/${encodeURIComponent(tripName)}`);
  }

  getTripTotal(tripName: string): Locator {
    // The link contains trip name + total, match by text containing trip name
    return this.page.getByRole('link', {name: new RegExp(tripName)});
  }

  // Trip Details page assertions

  async expectGrossTotal(amount: string) {
    await expect(this.page.getByText('Gross amount:')).toContainText(amount);
  }

  async expectOwnShareTotal(amount: string) {
    await expect(
      this.page.getByText('Net amount, own share only:')
    ).toContainText(amount);
  }

  async expectCategoryBreakdownVisible() {
    await expect(
      this.page.getByRole('heading', {name: 'Expenses by category'})
    ).toBeVisible();
  }

  async expectTransactionCount(count: number) {
    await expect(
      this.page.getByRole('heading', {name: `Transactions (${count})`})
    ).toBeVisible();
  }

  // Sorting interactions
  async sortByDate() {
    await this.page.getByRole('button', {name: 'date'}).click();
  }

  async sortByAmount() {
    await this.page.getByRole('button', {name: 'amount'}).click();
  }

  getTransactionList(): Locator {
    // Trip detail page shows transactions in a list
    return this.page.getByRole('listitem');
  }

  async expectTransactionOrder(vendors: string[]) {
    const transactionList = this.getTransactionList();
    for (let i = 0; i < vendors.length; i++) {
      await expect(transactionList.nth(i)).toContainText(vendors[i]);
    }
  }
}
