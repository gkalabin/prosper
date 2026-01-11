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

  test.describe('Advanced Filters', () => {
    test('filters by amount less than threshold', async ({page, seed}) => {
      // Given
      const user = await seed.createUser();
      const bank = await seed.createBank(user.id);
      const account = await seed.createAccount(user.id, bank.id);
      const category = await seed.createCategory(user.id);
      await seed.createExpense(user.id, account.id, category.id, 50, 'Nero');
      await seed.createExpense(user.id, account.id, category.id, 150, 'KFC');
      await seed.createExpense(user.id, account.id, category.id, 75, 'Costa');
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(user.login, user.rawPassword);
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
