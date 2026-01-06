import {test} from '../lib/fixtures/test-base';

test.describe('Trips', () => {
  test.describe('Trip Management', () => {
    test('creates a new trip', async () => {
      // TODO: Create user via seed
      // TODO: Log in
      // TODO: Navigate to trips page
      // TODO: Click add trip
      // TODO: Enter trip name and date range
      // TODO: Submit form
      // TODO: Verify trip appears in the list
    });
  });

  test.describe('Trip Details', () => {
    test('displays transactions associated with trip', async () => {
      // TODO: Create user with a trip and transactions linked to it via seed
      // TODO: Log in
      // TODO: Navigate to trip detail page
      // TODO: Verify associated transactions are displayed
    });

    test('displays trip total spend (gross and own share)', async () => {
      // TODO: Create user with a trip and expenses (including splits) via seed
      // TODO: Log in
      // TODO: Navigate to trip detail page
      // TODO: Verify gross total is displayed
      // TODO: Verify own share total is displayed
    });

    test('displays vendor statistics for trip', async () => {
      // TODO: Create user with a trip and expenses at various vendors via seed
      // TODO: Log in
      // TODO: Navigate to trip detail page
      // TODO: Verify vendor breakdown is displayed
    });

    test('sorts transactions within trip', async () => {
      // TODO: Create user with a trip and multiple transactions via seed
      // TODO: Log in
      // TODO: Navigate to trip detail page
      // TODO: Verify transaction list is sortable
      // TODO: Change sort order
      // TODO: Verify list order changes
    });
  });

  test.describe('Trip Association', () => {
    test('associates expense with trip during creation', async () => {
      // TODO: Create user with bank, account, category, and trip via seed
      // TODO: Log in
      // TODO: Navigate to add transaction page
      // TODO: Create expense and select the trip
      // TODO: Submit form
      // TODO: Navigate to trip detail page
      // TODO: Verify expense appears in trip
    });

    test('associates expense with trip via edit', async () => {
      // TODO: Create user with an expense and a trip via seed
      // TODO: Log in
      // TODO: Edit the expense to associate with trip
      // TODO: Save changes
      // TODO: Verify expense appears in trip detail page
    });

    test('removes trip association from expense', async () => {
      // TODO: Create user with an expense linked to a trip via seed
      // TODO: Log in
      // TODO: Edit the expense to remove trip association
      // TODO: Save changes
      // TODO: Verify expense no longer appears in trip detail page
    });
  });
});
