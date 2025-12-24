import { test, expect } from '@playwright/test';

test.describe('Dashboard/Overview', () => {
  test('should display the correct total expenses for the current month', async ({ page }) => {
    // 1. Log in.
    // 2. Create several transactions for the current month.
    // 3. Navigate to the overview page.
    // 4. Expect the total expenses widget to show the correct sum of the transactions.
  });

  test('should display a chart of recent expenses', async ({ page }) => {
    // 1. Log in.
    // 2. Create several transactions.
    // 3. Navigate to the overview page.
    // 4. Expect to see a chart displaying the recent expenses.
  });

  test('should show the latest transactions', async ({ page }) => {
    // 1. Log in.
    // 2. Create a new transaction.
    // 3. Navigate to the overview page.
    // 4. Expect to see the newly created transaction in the "latest transactions" list.
  });
});
