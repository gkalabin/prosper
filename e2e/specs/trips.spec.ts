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

    test('adds multiple expenses to same trip', async ({
      page,
      seed,
      loginAs,
    }) => {
      // Given: user with an existing trip
      const {user, account, category} = await seed.createUserWithTestData();
      const trip = await seed.createTrip(user.id, 'Barcelona 2026');
      // Add expenses to the trip
      await seed.createExpense(
        user.id,
        account.id,
        category.id,
        150,
        'Iberia Airlines',
        {tripId: trip.id}
      );
      await seed.createExpense(
        user.id,
        account.id,
        category.id,
        200,
        'Hotel Arts',
        {tripId: trip.id}
      );
      await loginAs(user);
      // When navigating to trips page
      const tripsPage = new TripsPage(page);
      await tripsPage.goto();
      // Then trip shows correct total (sum: 150 + 200 = 350)
      await expect(tripsPage.getTripTotal('Barcelona 2026')).toContainText(
        '$350'
      );
    });

    test.skip('edits trip dates', async () => {
      // Feature not implemented in UI - no trip edit page exists
    });
  });

  test.describe('Trip Details', () => {
    test('displays trip total expense', async ({page, seed, loginAs}) => {
      // Given: user with a trip containing multiple expenses (including split)
      const {user, account, category} = await seed.createUserWithTestData();
      const trip = await seed.createTrip(user.id, 'Paris-2026');
      // Regular expense: $300 (own share = $300)
      await seed.createExpense(
        user.id,
        account.id,
        category.id,
        300,
        'Air France',
        {tripId: trip.id}
      );
      // Split expense: $200 total, $100 own share
      await seed.createExpense(
        user.id,
        account.id,
        category.id,
        200,
        'Le Meurice',
        {tripId: trip.id, ownShareAmountCents: 10000, otherPartyName: 'Partner'}
      );
      await loginAs(user);
      // When navigating to trip detail page
      const tripsPage = new TripsPage(page);
      await tripsPage.gotoTrip('Paris-2026');
      // Then totals are displayed
      // Gross total: 300 + 200 = 500
      await tripsPage.expectGrossTotal('$500');
      // Own share: 300 + 100 = 400
      await tripsPage.expectOwnShareTotal('$400');
    });

    test.skip('displays expense breakdown by vendor', async () => {
      // Feature not implemented - Trip details only shows category breakdown, not vendor breakdown
    });

    test('displays expense breakdown by category', async ({
      page,
      seed,
      loginAs,
    }) => {
      // Given: user with a trip containing expenses in multiple categories
      const user = await seed.createUser();
      const bank = await seed.createBank(user.id, {name: 'Barclays'});
      const account = await seed.createAccount(user.id, bank.id, {
        name: 'Travel Card',
      });
      const transport = await seed.createCategory(user.id, {name: 'Transport'});
      const accommodation = await seed.createCategory(user.id, {
        name: 'Accommodation',
      });
      const food = await seed.createCategory(user.id, {name: 'Food & Dining'});
      const trip = await seed.createTrip(user.id, 'Tokyo-2026');
      // Create expenses in different categories
      await seed.createExpense(
        user.id,
        account.id,
        transport.id,
        800,
        'JAL Airlines',
        {tripId: trip.id}
      );
      await seed.createExpense(
        user.id,
        account.id,
        accommodation.id,
        500,
        'Shinjuku Hyatt',
        {tripId: trip.id}
      );
      await seed.createExpense(
        user.id,
        account.id,
        food.id,
        150,
        'Sukiyabashi Jiro',
        {tripId: trip.id}
      );
      await loginAs(user);
      // When navigating to trip detail page
      const tripsPage = new TripsPage(page);
      await tripsPage.gotoTrip('Tokyo-2026');
      // Then category breakdown section is visible (categories render in a chart)
      await tripsPage.expectCategoryBreakdownVisible();
      // Verify transactions count reflects our 3 expenses
      await tripsPage.expectTransactionCount(3);
    });

    test('displays sortable transaction list', async ({
      page,
      seed,
      loginAs,
    }) => {
      // Given: user with a trip containing multiple expenses
      const {user, account, category} = await seed.createUserWithTestData();
      const trip = await seed.createTrip(user.id, 'Rome-2026');
      // Create transactions with different amounts and dates
      const jan15 = new Date('2026-01-15T12:00:00');
      const jan20 = new Date('2026-01-20T12:00:00');
      const jan10 = new Date('2026-01-10T12:00:00');
      await seed.createExpense(
        user.id,
        account.id,
        category.id,
        100,
        'Colosseum Tickets',
        {
          tripId: trip.id,
          timestamp: jan15,
        }
      );
      await seed.createExpense(
        user.id,
        account.id,
        category.id,
        300,
        'Hotel Hassler',
        {
          tripId: trip.id,
          timestamp: jan20,
        }
      );
      await seed.createExpense(
        user.id,
        account.id,
        category.id,
        50,
        'Trattoria Mario',
        {
          tripId: trip.id,
          timestamp: jan10,
        }
      );
      await loginAs(user);
      // When navigating to trip detail page
      const tripsPage = new TripsPage(page);
      await tripsPage.gotoTrip('Rome-2026');
      // Then transactions can be sorted
      await tripsPage.expectTransactionCount(3);
      // Default sort is by date ascending (oldest first)
      await tripsPage.expectTransactionOrder([
        'Trattoria Mario',
        'Colosseum Tickets',
        'Hotel Hassler',
      ]);
      // Click sort by date to toggle to descending
      await tripsPage.sortByDate();
      await tripsPage.expectTransactionOrder([
        'Hotel Hassler',
        'Colosseum Tickets',
        'Trattoria Mario',
      ]);
      // Click sort by amount (descending first)
      await tripsPage.sortByAmount();
      await tripsPage.expectTransactionOrder([
        'Hotel Hassler',
        'Colosseum Tickets',
        'Trattoria Mario',
      ]);
      // Click again to toggle to ascending
      await tripsPage.sortByAmount();
      await tripsPage.expectTransactionOrder([
        'Trattoria Mario',
        'Colosseum Tickets',
        'Hotel Hassler',
      ]);
    });

    test('converts trip expenses to display currency', async ({
      page,
      seed,
      loginAs,
    }) => {
      // Given: user with accounts in multiple currencies
      const user = await seed.createUser();
      const bank = await seed.createBank(user.id, {name: 'HSBC'});
      const usdAccount = await seed.createAccount(user.id, bank.id, {
        name: 'USD Account',
        currencyCode: 'USD',
      });
      const eurAccount = await seed.createAccount(user.id, bank.id, {
        name: 'EUR Account',
        currencyCode: 'EUR',
      });
      const category = await seed.createCategory(user.id, {name: 'Travel'});
      const trip = await seed.createTrip(user.id, 'Vienna-2026');
      // Create expenses in different currencies
      await seed.createExpense(
        user.id,
        usdAccount.id,
        category.id,
        100,
        'United Airlines',
        {
          tripId: trip.id,
        }
      );
      await seed.createExpense(
        user.id,
        eurAccount.id,
        category.id,
        150,
        'Hotel Sacher',
        {
          tripId: trip.id,
        }
      );
      // Add exchange rate: 1 EUR = 1.10 USD
      await seed.createExchangeRate('EUR', 'USD', 1.1);
      // Set display currency to USD (default)
      await seed.updateDisplaySettings(user.id, {displayCurrencyCode: 'USD'});
      await loginAs(user);
      // When navigating to trip detail page
      const tripsPage = new TripsPage(page);
      await tripsPage.gotoTrip('Vienna-2026');
      // Then totals are displayed in USD
      // USD: $100 + EUR: €150 * 1.10 = $165 = $265 total
      await tripsPage.expectGrossTotal('$265');
    });
  });
});
