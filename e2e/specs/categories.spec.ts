import {expect, test} from '../lib/fixtures/test-base';
import {CategoryConfigPage} from '../pages/CategoryConfigPage';

test.describe('Categories', () => {
  test.describe('Category Management', () => {
    test('creates a top-level category', async ({page, seed, loginAs}) => {
      // Given
      const user = await seed.createUser();
      await loginAs(user);
      // When: creating a new category
      const categoryConfigPage = new CategoryConfigPage(page);
      await categoryConfigPage.goto();
      await categoryConfigPage.createCategory({name: 'Housing'});
      // Then: the category appears in the list
      await expect(
        categoryConfigPage.getCategoryItem(['Housing'])
      ).toBeVisible();
    });

    test('creates a nested subcategory', async ({page, seed, loginAs}) => {
      // Given: user and a category
      const user = await seed.createUser();
      await seed.createCategory(user.id, {name: 'Car'});
      await loginAs(user);
      // When: creating a nested subcategory
      const categoryConfigPage = new CategoryConfigPage(page);
      await categoryConfigPage.goto();
      await categoryConfigPage.createCategory({
        parentName: 'Car',
        name: 'Gas',
      });
      // Then: the subcategory appears nested under parent
      await expect(
        categoryConfigPage.getCategoryItem(['Car', 'Gas'])
      ).toBeVisible();
    });
  });
});
