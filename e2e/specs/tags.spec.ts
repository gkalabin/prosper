import {test} from '../lib/fixtures/test-base';

test.describe('Tags', () => {
  test.describe('Tag Management', () => {
    test('creates a tag when adding to transaction', async () => {
      // TODO: Create user with bank, account, category via seed
      // TODO: Log in
      // TODO: Navigate to add transaction page
      // TODO: Fill transaction details
      // TODO: Add a new tag by typing its name
      // TODO: Submit form
      // TODO: Verify tag is created and associated with transaction
    });

    test('reuses existing tag (case-insensitive)', async () => {
      // TODO: Create user with an existing tag (e.g., "Groceries") via seed
      // TODO: Log in
      // TODO: Navigate to add transaction page
      // TODO: Type the tag name in different case (e.g., "groceries")
      // TODO: Verify existing tag is suggested/selected
      // TODO: Submit form
      // TODO: Verify no duplicate tag is created
    });

    test('adds multiple tags to a single transaction', async () => {
      // TODO: Create user with bank, account, category via seed
      // TODO: Log in
      // TODO: Navigate to add transaction page
      // TODO: Fill transaction details
      // TODO: Add multiple tags
      // TODO: Submit form
      // TODO: Verify all tags are associated with the transaction
    });

    test('removes tag from transaction', async () => {
      // TODO: Create user with a transaction that has tags via seed
      // TODO: Log in
      // TODO: Navigate to edit transaction
      // TODO: Remove a tag
      // TODO: Save changes
      // TODO: Verify tag is no longer associated with transaction
    });
  });

  test.describe('Tag Filtering', () => {
    test('filters transactions by tag', async () => {
      // TODO: Create user with transactions having different tags via seed
      // TODO: Log in
      // TODO: Navigate to transaction list page
      // TODO: Filter by tag
      // TODO: Verify only transactions with that tag are shown
    });
  });
});
