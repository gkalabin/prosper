import { test, expect } from '@playwright/test';

test.describe('Trip Expense Management', () => {
  test('should allow a user to create a new trip', async ({ page }) => {
    // 1. Log in.
    // 2. Navigate to the trips page.
    // 3. Click "new trip".
    // 4. Fill in the trip details (name, dates, etc.).
    // 5. Save the trip.
    // 6. Expect to see the new trip in the list of trips.
  });

  test('should allow a user to add an expense to a trip', async ({ page }) => {
    // 1. Log in.
    // 2. Create a trip.
    // 3. Navigate to the trip's page.
    // 4. Add a new expense associated with the trip.
    // 5. Expect the expense to be listed under the trip's expenses.
  });

  test('should display the total cost of a trip', async ({ page }) => {
    // 1. Log in.
    // 2. Create a trip and add several expenses to it.
    // 3. Navigate to the trip's page.
    // 4. Expect to see the correct total cost of the trip.
  });
});
