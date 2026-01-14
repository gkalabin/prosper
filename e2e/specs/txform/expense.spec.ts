import {expect, test} from '../../lib/fixtures/test-base';
import {ExpenseStatsPage} from '../../pages/ExpenseStatsPage';
import {NewTransactionPage} from '../../pages/NewTransactionPage';
import {OverviewPage} from '../../pages/OverviewPage';
import {TransactionListPage} from '../../pages/TransactionListPage';

test.describe('Expense Transactions', () => {
  test('creates a simple expense', async ({page, seed, loginAs}) => {
    // Given
    const {user, category} = await seed.createUserWithTestData({
      bank: {name: 'HSBC'},
      account: {name: 'Current', initialBalanceCents: 10000}, // $100
      category: {name: 'Groceries'},
    });
    await loginAs(user);
    // When
    const addTxPage = new NewTransactionPage(page);
    await addTxPage.goto();
    await addTxPage.form.addExpense({
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
    await overviewPage.expectTotalBalance('$58');
  });

  test('creates an expense with split (shared expense)', async ({
    page,
    seed,
    loginAs,
  }) => {
    // Given: User with bank, account, and category
    const {user, category} = await seed.createUserWithTestData({
      account: {initialBalanceCents: 50000}, // $500
    });
    await loginAs(user);
    // When: Create a split expense where total is $100, user's share is $60
    const addTxPage = new NewTransactionPage(page);
    await addTxPage.goto();
    await addTxPage.form.addSplitExpense({
      amount: 100,
      ownShareAmount: 60,
      companion: 'Alice',
      datetime: new Date(),
      vendor: "Wendy's",
      category: category.name,
    });

    // Then: Account balance should be reduced by the whole expense ($500 - $100 = $400)
    const overviewPage = new OverviewPage(page);
    await overviewPage.goto();
    await overviewPage.expectTotalBalance('$400');
    // And: Stats page should show expense as own share ($60)
    const statsPage = new ExpenseStatsPage(page);
    await statsPage.goto();
    await statsPage.selectDuration('Last 6 months');
    // Chart shows 6 months: previous 5 months with no expenses, current month with $60 own share
    await statsPage.expectMonthlyChartAmounts([0, 0, 0, 0, 0, 60]);
  });

  test('edits an existing expense', async ({page, seed, loginAs}) => {
    // Given: User with bank, account, category, and existing expense
    const {user, account, category} = await seed.createUserWithTestData();
    await seed.createExpense(user.id, account.id, category.id, 30, 'Nero');
    await loginAs(user);
    // When: editing expense
    const listPage = new TransactionListPage(page);
    await listPage.goto();
    const form = await listPage.openEditForm('Nero');
    await form.editExpense({
      amount: 45.5,
      vendor: 'Costa',
    });
    // Refresh the page to see updated data
    await listPage.goto();
    // Then: updated values are displayed
    await expect(listPage.getTransactionListItem('Costa')).toBeVisible();
    await expect(listPage.getTransactionListItem('$45.5')).toBeVisible();
    await expect(listPage.getTransactionListItem('Nero')).not.toBeVisible();
  });

  test('creates expense with a note', async ({page, seed, loginAs}) => {
    // Given
    const {user, category} = await seed.createUserWithTestData({
      bank: {name: 'Barclays'},
      account: {name: 'Checking', initialBalanceCents: 20000}, // $200
      category: {name: 'Shopping'},
    });
    await loginAs(user);
    // When: create expense with a note
    const addTxPage = new NewTransactionPage(page);
    await addTxPage.goto();
    await addTxPage.form.addExpense({
      amount: 35.5,
      datetime: new Date(),
      vendor: 'Amazon',
      category: category.name,
      note: 'Birthday gift for friend',
    });
    // Then: verify the note is displayed in transaction details
    const transactionListPage = new TransactionListPage(page);
    await transactionListPage.goto();
    await transactionListPage.expectTransactionHasNote(
      'Amazon',
      'Birthday gift for friend'
    );
  });

  test('changing expense account updates both account balances', async ({
    page,
    seed,
    loginAs,
  }) => {
    // Given: User with two accounts and an expense in Account1
    const {user, bank, account, category} = await seed.createUserWithTestData({
      bank: {name: 'Chase'},
      account: {name: 'Checking', initialBalanceCents: 50000}, // $500
      category: {name: 'Food'},
    });
    const account2 = await seed.createAccount(user.id, bank.id, {
      name: 'Savings',
      initialBalanceCents: 30000, // $300
    });
    await seed.createExpense(user.id, account.id, category.id, 50, 'Chipotle');
    await loginAs(user);
    // Verify initial balances: Checking $450 ($500 - $50), Savings $300
    const overviewPage = new OverviewPage(page);
    await overviewPage.goto();
    await overviewPage.expectAccountBalance('Chase', 'Checking', '$450');
    await overviewPage.expectAccountBalance('Chase', 'Savings', '$300');
    await overviewPage.expectTotalBalance('$750');
    // When: edit the expense to use Account2 instead
    const listPage = new TransactionListPage(page);
    await listPage.goto();
    const form = await listPage.openEditForm('Chipotle');
    await form.editExpense({account: 'Savings'});
    // Then: Checking balance restored, Savings reduced, total unchanged
    await overviewPage.goto();
    await overviewPage.expectAccountBalance('Chase', 'Checking', '$500');
    await overviewPage.expectAccountBalance('Chase', 'Savings', '$250');
    await overviewPage.expectTotalBalance('$750');
  });

  test('changing expense category reflects in stats', async ({
    page,
    seed,
    loginAs,
  }) => {
    // Given: User with two categories and expense in Groceries
    const {
      user,
      account,
      category: groceriesCategory,
    } = await seed.createUserWithTestData({
      bank: {name: 'Wells Fargo'},
      category: {name: 'Groceries'},
    });
    const diningCategory = await seed.createCategory(user.id, {
      name: 'Dining',
    });
    await seed.createExpense(
      user.id,
      account.id,
      groceriesCategory.id,
      25,
      'Trader Joes'
    );
    await loginAs(user);
    // When: edit the expense to change category to Dining
    const listPage = new TransactionListPage(page);
    await listPage.goto();
    const form = await listPage.openEditForm('Trader Joes');
    await form.editExpense({category: diningCategory.name});
    // Then: verify the expense appears in stats (chart data shows $25 expense)
    const statsPage = new ExpenseStatsPage(page);
    await statsPage.goto();
    await statsPage.selectDuration('Last 6 months');
    // Chart shows expense data: 5 months of 0, current month shows $25
    await statsPage.expectMonthlyChartAmounts([0, 0, 0, 0, 0, 25]);
  });
});
