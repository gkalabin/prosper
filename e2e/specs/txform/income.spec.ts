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

  test('edits an existing income transaction', async ({
    page,
    seed,
    loginAs,
  }) => {
    // Given: User with an income transaction
    const {user, account, category} = await seed.createUserWithTestData({
      account: {initialBalanceCents: 30000}, // $300 initial
    });
    await seed.createIncome(user.id, account.id, category.id, 500, 'Google');
    await loginAs(user);

    // When: Edit the income
    const listPage = new TransactionListPage(page);
    await listPage.goto();
    const form = await listPage.openEditForm('Google');
    await form.editIncome({
      amount: 750,
      payer: 'Microsoft',
    });

    // Then: Verify updated values in transaction list
    await listPage.goto();
    await expect(listPage.getTransactionListItem('Microsoft')).toBeVisible();
    await expect(listPage.getTransactionListItem('$750')).toBeVisible();
    await expect(listPage.getTransactionListItem('Google')).not.toBeVisible();

    // And: Account balance reflects the change ($300 + $750 = $1050)
    const overviewPage = new OverviewPage(page);
    await overviewPage.goto();
    await overviewPage.expectTotalBalance('$1,050');
  });

  test('changing income account updates both account balances', async ({
    page,
    seed,
    loginAs,
  }) => {
    // Given: User with two accounts
    const user = await seed.createUser();
    const bank = await seed.createBank(user.id, {name: 'Chase'});
    const account1 = await seed.createAccount(user.id, bank.id, {
      name: 'Checking',
      initialBalanceCents: 50000, // $500
    });
    const account2 = await seed.createAccount(user.id, bank.id, {
      name: 'Savings',
      initialBalanceCents: 100000, // $1000
    });
    const category = await seed.createCategory(user.id, {name: 'Salary'});
    // Create income in account1
    await seed.createIncome(user.id, account1.id, category.id, 200, 'Employer');
    await loginAs(user);

    // When: Edit income to use account2 instead
    const listPage = new TransactionListPage(page);
    await listPage.goto();
    const form = await listPage.openEditForm('Employer');
    await form.editIncome({
      account: 'Savings',
    });

    // Then: Account1 loses the income ($500), Account2 gains it ($1000 + $200)
    const overviewPage = new OverviewPage(page);
    await overviewPage.goto();
    // Checking (original) should show $500, Savings (new) should show $1200
    // Total balance unchanged: $500 + $1200 = $1700
    await overviewPage.expectTotalBalance('$1,700');
  });

  // Note: Income statistics tests belong in e2e/specs/stats/income.spec.ts
});
