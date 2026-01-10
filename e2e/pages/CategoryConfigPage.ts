import {type Locator, type Page, expect} from '@playwright/test';

export class CategoryConfigPage {
  readonly page: Page;
  readonly addNewCategoryButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addNewCategoryButton = page
      .getByRole('button', {
        name: 'Add new category',
      })
      // For convenience, there are two buttons to add a new category - at the top and at the bottom of the page.
      // They behave exactly the same way, select the first one to avoid test failures.
      .first();
  }

  async goto() {
    await this.page.goto('/config/categories');
  }

  getCategoryItem(categoryName: string) {
    return this.page.getByText(categoryName, {exact: true});
  }

  async createCategory(name: string) {
    await this.addNewCategoryButton.click();
    const categoryForm = this.page.locator('form');
    await categoryForm.getByLabel('Category Name').fill(name);
    const addButton = categoryForm.getByRole('button', {name: 'Add'});
    await addButton.click();
    // Wait for the category form to disappear, indicating creation completed.
    await expect(categoryForm).not.toBeVisible();
  }

  async createSubcategory({
    childName,
    parentName,
  }: {
    childName: string;
    parentName: string;
  }) {
    await this.addNewCategoryButton.click();
    const categoryForm = this.page.locator('form');
    await categoryForm.getByLabel('Category Name').fill(childName);
    await categoryForm
      .getByLabel('Parent Category')
      .selectOption({label: parentName});
    const addButton = categoryForm.getByRole('button', {name: 'Add'});
    await addButton.click();
    // Wait for the category form to disappear, indicating creation completed.
    await expect(categoryForm).not.toBeVisible();
  }

  getSubcategoryItem({
    parentName,
    childName,
  }: {
    parentName: string;
    childName: string;
  }) {
    return this.getCategoryItem(childName);
  }
}
