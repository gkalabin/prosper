import {test} from '../lib/fixtures/test-base';

test.describe('Categories', () => {
  test.describe('Category Management', () => {
    test('creates a top-level category', async () => {
      // TODO: Create user via seed
      // TODO: Log in
      // TODO: Navigate to categories configuration page
      // TODO: Click add category
      // TODO: Enter category name
      // TODO: Submit form
      // TODO: Verify category appears in the list
    });

    test('creates a nested subcategory', async () => {
      // TODO: Create user with a parent category via seed
      // TODO: Log in
      // TODO: Navigate to categories configuration page
      // TODO: Click add subcategory under the parent
      // TODO: Enter subcategory name
      // TODO: Submit form
      // TODO: Verify subcategory appears nested under parent
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
