import { test, expect } from '@playwright/test';

test.describe('Transactions Management', () => {
  test('should allow a user to create a new expense', async ({ page }) => {
    // 1. Log in.
    // 2. Navigate to the "new" expense page.
    // 3. Fill in the expense form with details (amount, category, date, etc.).
    // 4. Submit the form.
    // 5. Expect to be redirected to the transactions list.
    // 6. Expect to see the newly created transaction in the list.
  });

  test('should allow a user to edit an existing expense', async ({ page }) => {
    // 1. Log in.
    // 2. Create a transaction to be edited.
    // 3. Navigate to the transactions list.
    // 4. Find the transaction and click the "edit" button.
    // 5. Change some details of the transaction.
    // 6. Submit the form.
    // 7. Expect to see the updated transaction in the list.
  });

  test('should allow a user to delete an existing expense', async ({ page }) => {
    // 1. Log in.
    // 2. Create a transaction to be deleted.
    // 3. Navigate to the transactions list.
    // 4. Find the transaction and click the "delete" button.
    // 5. Confirm the deletion.
    // 6. Expect the transaction to be removed from the list.
  });

  test('should filter transactions by date', async ({ page }) => {
    // 1. Log in.
    // 2. Create several transactions with different dates.
    // 3. Navigate to the transactions list.
    // 4. Use the date filter to select a date range.
    // 5. Expect to see only the transactions within the selected date range.
  });

  test('should filter transactions by category', async ({ page }) => {
    // 1. Log in.
    // 2. Create several transactions with different categories.
    // 3. Navigate to the transactions list.
    // 4. Use the category filter to select a category.
    // 5. Expect to see only the transactions with the selected category.
  });
});
