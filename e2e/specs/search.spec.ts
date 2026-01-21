import {expect, test} from '../lib/fixtures/test-base';
import {TransactionListPage} from '../pages/TransactionListPage';

test.describe('Transaction Search and Filtering', () => {
  test.describe('Basic Keyword Search', () => {
    test('filters transactions by vendor name', async ({
      page,
      seed,
      loginAs,
    }) => {
      // Given
      const {user, account, category} = await seed.createUserWithTestData();
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
      await loginAs(user);
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
  });

  test.describe('Advanced Filters', () => {
    test('filters by amount less than threshold', async ({
      page,
      seed,
      loginAs,
    }) => {
      // Given
      const {user, account, category} = await seed.createUserWithTestData();
      await seed.createExpense(user.id, account.id, category.id, 50, 'Nero');
      await seed.createExpense(user.id, account.id, category.id, 150, 'KFC');
      await seed.createExpense(user.id, account.id, category.id, 75, 'Costa');
      await loginAs(user);
      const listPage = new TransactionListPage(page);
      await listPage.goto();
      // When
      await listPage.search('amount<100');
      // Then
      await expect(listPage.getTransactionListItem('Nero')).toHaveCount(1);
      await expect(listPage.getTransactionListItem('Costa')).toHaveCount(1);
      await expect(listPage.getTransactionListItem('KFC')).toHaveCount(0);
    });
  });
});
