import {type Locator, type Page, expect} from '@playwright/test';

export class DisplaySettingsPage {
  readonly page: Page;
  readonly excludeCategoriesField: Locator;

  constructor(page: Page) {
    this.page = page;
    this.excludeCategoriesField = page.getByRole('combobox', {
      name: 'Categories to exclude in stats',
    });
  }

  async goto() {
    await this.page.goto('/config/display-settings');
  }

  async selectDisplayCurrency(currencyCode: string) {
    await this.page.getByLabel('Display currency').selectOption(currencyCode);
  }

  async save() {
    await this.page.getByRole('button', {name: 'Save'}).click();
    await expect(this.page.getByText('Successfully saved!')).toBeVisible();
  }

  async addExcludedCategory(categoryName: string) {
    await this.excludeCategoriesField.click();
    await this.page.getByRole('option', {name: categoryName}).click();
  }

  async removeExcludedCategory(categoryName: string) {
    await this.excludeCategoriesField
      .getByRole('button', {name: `Remove ${categoryName}`})
      .click();
  }
}
