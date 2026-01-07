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
  });
});
