import {expect, test} from '../lib/fixtures/test-base';
import {AddTransactionPage} from '../pages/AddTransactionPage';
import {LoginPage} from '../pages/LoginPage';
import {OverviewPage} from '../pages/OverviewPage';
import {TransactionListPage} from '../pages/TransactionListPage';

test.describe('Create Transactions', () => {
  test.describe('Expense Transactions', () => {
    test('creates a simple expense', async ({page, seed}) => {
      // Given
      const user = await seed.createUser();
      const bank = await seed.createBank(user.id, {name: 'HSBC'});
      await seed.createAccount(user.id, bank.id, {
        name: 'Current',
        // Initial balance $100
        initialBalanceCents: 10000,
      });
      const category = await seed.createCategory(user.id, {name: 'Groceries'});
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(user.login, user.rawPassword);
      // When
      const addTxPage = new AddTransactionPage(page);
      await addTxPage.goto();
      await addTxPage.addExpense({
        amount: 42.2,
        datetime: new Date(),
        vendor: 'Whole Foods',
        category: category.name,
      });
      // Then
      const transactionListPage = new TransactionListPage(page);
      await transactionListPage.goto();
      await expect(
        transactionListPage.getTransactionListItem('Whole Foods')
      ).toBeVisible();
      await expect(
        transactionListPage.getTransactionListItem('$42.2')
      ).toBeVisible();
      // Verify account balance is updated on overview
      const overviewPage = new OverviewPage(page);
      await overviewPage.goto();
      // Total balance is rounded on the overview page.
      await overviewPage.expectBalance('$58');
    });
  });
});
