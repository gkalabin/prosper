import {expect, test} from '../lib/fixtures/test-base';
import {CategoryConfigPage} from '../pages/CategoryConfigPage';
import {LoginPage} from '../pages/LoginPage';

test.describe('Categories', () => {
  test.describe('Category Management', () => {
    test('creates a top-level category', async ({page, seed}) => {
      // Given
      const user = await seed.createUser();
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(user.login, user.rawPassword);
      // When: creating a new category
      const categoryConfigPage = new CategoryConfigPage(page);
      await categoryConfigPage.goto();
      await categoryConfigPage.createCategory('Housing');
      // Then: the category appears in the list
      await expect(
        categoryConfigPage.getCategoryItem(['Housing'])
      ).toBeVisible();
    });

    test('creates a nested subcategory', async ({page, seed}) => {
      // Given: user and a category
      const user = await seed.createUser();
      await seed.createCategory(user.id, {name: 'Car'});
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(user.login, user.rawPassword);
      // When: creating a nested subcategory
      const categoryConfigPage = new CategoryConfigPage(page);
      await categoryConfigPage.goto();
      await categoryConfigPage.createSubcategory({
        parentName: 'Car',
        childName: 'Gas',
      });
      // Then: the subcategory appears nested under parent
      await expect(
        categoryConfigPage.getCategoryItem(['Car', 'Gas'])
      ).toBeVisible();
    });

    test('edits a category name', async () => {
      // TODO: Create user with a category via seed
      // TODO: Log in
      // TODO: Navigate to categories configuration page
      // TODO: Click edit on the category
      // TODO: Change category name
      // TODO: Save changes
      // TODO: Verify updated name is displayed
    });

    test('unnests a subcategory to top level', async () => {
      // TODO: Create user with a nested category (parent > child) via seed
      // TODO: Log in
      // TODO: Navigate to categories configuration page
      // TODO: Click edit on the nested subcategory
      // TODO: Change parent to none/top-level
      // TODO: Save changes
      // TODO: Verify category is now at top level (not nested)
    });
  });

  test.describe('Category Usage', () => {
    test('selects category when creating a transaction', async () => {
      // TODO: Create user with categories via seed
      // TODO: Log in
      // TODO: Navigate to add transaction page
      // TODO: Verify category selector shows available categories
      // TODO: Select a category
      // TODO: Complete and submit transaction
      // TODO: Verify transaction is associated with selected category
    });

    test('filters transactions by category in stats', async () => {
      // TODO: Create user with transactions in different categories via seed
      // TODO: Log in
      // TODO: Navigate to statistics page
      // TODO: Configure to exclude certain categories
      // TODO: Verify filtered categories are not included in stats
    });
  });
});
