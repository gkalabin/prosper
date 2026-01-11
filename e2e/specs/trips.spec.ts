import {expect, test} from '../lib/fixtures/test-base';
import {LoginPage} from '../pages/LoginPage';
import {NewTransactionPage} from '../pages/NewTransactionPage';
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
