import {expect, test} from '../../lib/fixtures/test-base';
import {NewTransactionPage} from '../../pages/NewTransactionPage';
import {OverviewPage} from '../../pages/OverviewPage';
import {TransactionListPage} from '../../pages/TransactionListPage';

test.describe('Income Transactions', () => {
  test('creates an income transaction', async ({page, seed, loginAs}) => {
    // Given
    const {user, category} = await seed.createUserWithTestData({
      account: {initialBalanceCents: 50000}, // $500 initial balance
    });
    await loginAs(user);
    // When
    const addTxPage = new NewTransactionPage(page);
    await addTxPage.goto();
    await addTxPage.form.addIncome({
      amount: 1500,
      datetime: new Date(),
      payer: 'Acme Corp',
      category: category.name,
    });
    // Then
    const listPage = new TransactionListPage(page);
    await listPage.goto();
    await expect(listPage.getTransactionListItem('Acme Corp')).toBeVisible();
    await expect(listPage.getTransactionListItem('$1,500')).toBeVisible();
    // Verify account balance is updated on overview to $2000 - $500 initial balance and $1500 income
    const overviewPage = new OverviewPage(page);
    await overviewPage.goto();
    await overviewPage.expectTotalBalance('$2,000');
  });
});
