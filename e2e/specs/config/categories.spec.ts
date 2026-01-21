import {expect, test} from '../../lib/fixtures/test-base';
import {CategoryConfigPage} from '../../pages/CategoryConfigPage';

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

    test('edits an existing category name', async ({page, seed, loginAs}) => {
      // Given
      const user = await seed.createUser();
      await seed.createCategory(user.id, {name: 'Food'});
      await loginAs(user);
      // When editing the category name
      const categoryConfigPage = new CategoryConfigPage(page);
      await categoryConfigPage.goto();
      await categoryConfigPage.editCategory({
        currentPath: ['Food'],
        newName: 'Groceries',
        newParentName: null,
      });
      // Then the name changes
      await expect(
        categoryConfigPage.getCategoryItem(['Groceries'])
      ).toBeVisible();
      await expect(
        categoryConfigPage.getCategoryItem(['Food'])
      ).not.toBeVisible();
    });

    test('moves category to a different parent', async ({
      page,
      seed,
      loginAs,
    }) => {
      // Given nested category Car > Gas
      const user = await seed.createUser();
      const transportation = await seed.createCategory(user.id, {
        name: 'Car',
      });
      await seed.createCategory(user.id, {
        name: 'Gas',
        parentCategoryId: transportation.id,
      });
      await seed.createCategory(user.id, {name: 'Fuel'});
      await loginAs(user);
      // When changing parent category
      const cfgPage = new CategoryConfigPage(page);
      await cfgPage.goto();
      await cfgPage.editCategory({
        currentPath: ['Car', 'Gas'],
        newName: 'Gas',
        newParentName: 'Fuel',
      });
      // Then relationship updates
      await expect(cfgPage.getCategoryItem(['Fuel', 'Gas'])).toBeVisible();
      await expect(cfgPage.getCategoryItem(['Car', 'Gas'])).not.toBeVisible();
    });
  });
});
