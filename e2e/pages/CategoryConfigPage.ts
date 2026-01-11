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

  /**
   * Get a category item by navigating through the tree hierarchy.
   * Accepts an array of names representing the path from root to the target category.
   *
   * @example getCategoryItem(['Car', 'Gas']) - finds the "Gas" category under "Car"
   */
  getCategoryItem(categoryPath: string[]) {
    let locator = this.page.getByRole('list').first();
    for (const categoryName of categoryPath) {
      locator = locator
        .getByRole('listitem')
        .filter({
          has: this.page.getByText(categoryName, {exact: true}),
        })
        .first();
    }
    return locator;
  }

  async createCategory({
    name,
    parentName,
  }: {
    name: string;
    parentName?: string;
  }) {
    await this.addNewCategoryButton.click();
    const categoryForm = this.page.locator('form');
    await categoryForm.getByLabel('Category Name').fill(name);
    if (parentName) {
      await categoryForm
        .getByLabel('Parent Category')
        .selectOption({label: parentName});
    }
    const addButton = categoryForm.getByRole('button', {name: 'Add'});
    await addButton.click();
    // Wait for the category form to disappear, indicating creation completed.
    await expect(categoryForm).not.toBeVisible();
  }
}
