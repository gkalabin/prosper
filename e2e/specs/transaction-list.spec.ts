import {expect, test} from '../lib/fixtures/test-base';
import {LoginPage} from '../pages/LoginPage';
import {TransactionListPage} from '../pages/TransactionListPage';

test.describe('Transaction List View', () => {
  test('displays recent transaction in history', async ({page, seed}) => {
    // Given
    const user = await seed.createUser();
    const bank = await seed.createBank(user.id);
    const account = await seed.createAccount(user.id, bank.id);
    const category = await seed.createCategory(user.id, {name: 'Coffee'});
    await seed.createExpense(
      user.id,
      account.id,
      category.id,
      4.5,
      'Starbucks'
    );
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(user.login, user.rawPassword);

    // When
    const transactionListPage = new TransactionListPage(page);
    await transactionListPage.goto();

    // Then
    const item = transactionListPage.getTransactionListItem('Starbucks');
    await expect(item).toBeVisible();
    await expect(item).toContainText('$4.50');
  });
});
