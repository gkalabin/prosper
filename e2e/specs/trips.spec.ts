import {expect, test} from '../lib/fixtures/test-base';
import {AddTransactionPage} from '../pages/AddTransactionPage';
import {LoginPage} from '../pages/LoginPage';
import {TripsPage} from '../pages/TripsPage';

test.describe('Trips', () => {
  test.describe('Trip Management', () => {
    test('creates a new trip', async ({page, seed}) => {
      // Given
      const user = await seed.createUser();
      const bank = await seed.createBank(user.id);
      await seed.createAccount(user.id, bank.id);
      const category = await seed.createCategory(user.id);
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(user.login, user.rawPassword);
      // When create a new transaction with an unused trip name
      const addTxPage = new AddTransactionPage(page);
      await addTxPage.goto();
      await addTxPage.addExpense({
        amount: 150,
        datetime: new Date(),
        vendor: 'Delta Airlines',
        category: category.name,
        trip: 'Japan 2026',
      });
      // Then trip appears in the trips list
      const tripsPage = new TripsPage(page);
      await tripsPage.goto();
      await expect(tripsPage.getTripLink('Japan 2026')).toBeVisible();
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
