import {expect, test} from '../lib/fixtures/test-base';
import {NewTransactionPage} from '../pages/NewTransactionPage';
import {TripsPage} from '../pages/TripsPage';

test.describe('Trips', () => {
  test.describe('Trip Management', () => {
    test('creates a new trip', async ({page, seed, loginAs}) => {
      // Given
      const {user, category} = await seed.createUserWithTestData();
      await loginAs(user);
      // When create a new transaction with an unused trip name
      const addTxPage = new NewTransactionPage(page);
      await addTxPage.goto();
      await addTxPage.form.addExpense({
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
});
