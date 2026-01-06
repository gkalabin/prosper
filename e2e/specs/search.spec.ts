import {expect, test} from '../lib/fixtures/test-base';
import {LoginPage} from '../pages/LoginPage';
import {TransactionListPage} from '../pages/TransactionListPage';

test.describe('Transaction Search and Filtering', () => {
  test.describe('Basic Keyword Search', () => {
    test('filters transactions by vendor name', async ({page, seed}) => {
      // Given
      const user = await seed.createUser();
      const bank = await seed.createBank(user.id);
      const account = await seed.createAccount(user.id, bank.id);
      const category = await seed.createCategory(user.id);
      await seed.createExpense(
        user.id,
        account.id,
        category.id,
        5.5,
        'Starbucks'
      );
      await seed.createExpense(user.id, account.id, category.id, 25.0, 'Tesco');
      await seed.createExpense(
        user.id,
        account.id,
        category.id,
        12.0,
        'Starbucks'
      );
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(user.login, user.rawPassword);
      const transactionListPage = new TransactionListPage(page);
      await transactionListPage.goto();
      // When
      await transactionListPage.search('Starbucks');
      // Then
      await expect(
        transactionListPage.getTransactionListItem('Starbucks')
      ).toHaveCount(2);
      await expect(
        transactionListPage.getTransactionListItem('Tesco')
      ).toHaveCount(0);
    });

    test('filters transactions by note content', async () => {
      // TODO: Create user with transactions having different notes via seed
      // TODO: Log in
      // TODO: Navigate to transaction list page
      // TODO: Search for text that appears in a note
      // TODO: Verify matching transactions are shown
    });

    test('shows empty state when no matches found', async () => {
      // TODO: Create user with transactions via seed
      // TODO: Log in
      // TODO: Navigate to transaction list page
      // TODO: Search for a term that has no matches
      // TODO: Verify empty state message is displayed
    });

    test('search is case-insensitive', async () => {
      // TODO: Create user with a transaction (e.g., vendor "Starbucks") via seed
      // TODO: Log in
      // TODO: Navigate to transaction list page
      // TODO: Search for lowercase version (e.g., "starbucks")
      // TODO: Verify transaction is found
    });
  });

  test.describe('Advanced Filters', () => {
    test('filters by amount greater than threshold', async () => {
      // TODO: Create user with transactions of varying amounts via seed
      // TODO: Log in
      // TODO: Navigate to transaction list page
      // TODO: Enter filter: amount>5000
      // TODO: Verify only transactions with amount > 5000 are shown
    });

    test('filters by amount less than threshold', async () => {
      // TODO: Create user with transactions of varying amounts via seed
      // TODO: Log in
      // TODO: Navigate to transaction list page
      // TODO: Enter filter: amount<100
      // TODO: Verify only transactions with amount < 100 are shown
    });

    test('filters by date range', async () => {
      // TODO: Create user with transactions across different dates via seed
      // TODO: Log in
      // TODO: Navigate to transaction list page
      // TODO: Enter filter: date>=2025-01-01
      // TODO: Verify only transactions on or after that date are shown
    });

    test('filters by vendor with vendor: prefix', async () => {
      // TODO: Create user with transactions at different vendors via seed
      // TODO: Log in
      // TODO: Navigate to transaction list page
      // TODO: Enter filter: vendor:Starbucks
      // TODO: Verify only Starbucks transactions are shown
    });

    test('combines multiple filters', async () => {
      // TODO: Create user with diverse transactions via seed
      // TODO: Log in
      // TODO: Navigate to transaction list page
      // TODO: Enter multiple filters (e.g., amount>100 vendor:Coffee)
      // TODO: Verify only transactions matching all criteria are shown
    });
  });

  test.describe('Search Summary Statistics', () => {
    test('displays total spent for filtered results', async () => {
      // TODO: Create user with transactions via seed
      // TODO: Log in
      // TODO: Navigate to transaction list page
      // TODO: Apply a filter
      // TODO: Verify summary shows total spent for filtered transactions
    });

    test('displays total received for filtered results', async () => {
      // TODO: Create user with income transactions via seed
      // TODO: Log in
      // TODO: Navigate to transaction list page
      // TODO: Filter to show income
      // TODO: Verify summary shows total received
    });

    test('displays vendor frequency in filtered results', async () => {
      // TODO: Create user with multiple transactions at same vendor via seed
      // TODO: Log in
      // TODO: Navigate to transaction list page
      // TODO: Verify vendor frequency count is displayed
    });
  });
});
