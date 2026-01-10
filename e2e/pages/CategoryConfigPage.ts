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

  // TODO: accept an array of category names to recursively navigate through nesting
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

  // TODO: createSubcategory is almost the same as createCategory, but with an additional parent category selector.
  // Unify the code to avoid duplication, but make sure to keep the test logic easy to follow and clean methods split and structure.
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
    // TODO: verify the parent category name as well
    return this.getCategoryItem(childName);
  }
}
