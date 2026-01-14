import {type Locator, type Page, expect} from '@playwright/test';

export class DisplaySettingsPage {
  readonly page: Page;
  readonly currencySelect: Locator;
  readonly excludeCategoriesButton: Locator;
  readonly saveButton: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.currencySelect = page.getByLabel('Display currency');
    // The multiselect trigger is a button with role="combobox"
    // Filter to get only the button, not the select element
    this.excludeCategoriesButton = page
      .getByRole('combobox')
      .and(page.locator('button'));
    this.saveButton = page.getByRole('button', {name: 'Save'});
    this.successMessage = page.getByText('Successfully saved!');
  }

  async goto() {
    await this.page.goto('/config/display-settings');
  }

  async selectDisplayCurrency(currencyCode: string) {
    await this.currencySelect.selectOption(currencyCode);
  }

  async expectDisplayCurrency(currencyCode: string) {
    await expect(this.currencySelect).toHaveValue(currencyCode);
  }

  async save() {
    await this.saveButton.click();
    await expect(this.successMessage).toBeVisible();
  }

  async addExcludedCategory(categoryName: string) {
    await this.excludeCategoriesButton.click();
    await this.page.getByRole('option', {name: categoryName}).click();
  }

  async removeExcludedCategory(categoryName: string) {
    // Find the badge div containing the category name and click its remove button (span with role="button")
    const badge = this.excludeCategoriesButton.locator('div', {
      hasText: categoryName,
    });
    await badge.getByRole('button').click();
  }

  async expectCategoryExcluded(categoryName: string) {
    // Check that the category appears as text within the combobox button
    await expect(this.excludeCategoriesButton).toContainText(categoryName);
  }

  async expectCategoryNotExcluded(categoryName: string) {
    // Check that the category does not appear in the combobox
    await expect(this.excludeCategoriesButton).not.toContainText(categoryName);
  }
}
