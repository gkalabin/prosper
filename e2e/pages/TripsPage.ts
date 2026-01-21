import {type Page} from '@playwright/test';

export class TripsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/trips');
  }

  getTripLink(tripName: string) {
    return this.page.getByRole('link', {name: tripName});
  }
}
