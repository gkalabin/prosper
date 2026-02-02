import {expect, test} from '../../lib/fixtures/test-base';
import {ExpenseStatsPage} from '../../pages/ExpenseStatsPage';
import {NewTransactionPage} from '../../pages/NewTransactionPage';
import {OverviewPage} from '../../pages/OverviewPage';
import {TransactionListPage} from '../../pages/TransactionListPage';

// TODO:
//  - change expense to income
//  - change expense to transfer
//  - create expense paid by someone else
//  - create expense with repayment

test.describe('Expense Transactions', () => {
  test('create a simple expense', async ({page, seed, loginAs}) => {
    const {user, category} = await seed.createUserWithTestData({
      bank: {name: 'HSBC'},
      account: {name: 'Current', initialBalanceCents: 10000}, // $100
      category: {name: 'Groceries'},
    });
    await loginAs(user);
    const addTxPage = new NewTransactionPage(page);
    await addTxPage.goto();
    await addTxPage.form.addExpense({
      amount: 42.2,
      datetime: new Date(),
      vendor: 'Whole Foods',
      category: category.name,
    });
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

  test('create a shared expense', async ({page, seed, loginAs}) => {
    // Given: User with bank, account, and category
    const {user, category} = await seed.createUserWithTestData({
      account: {initialBalanceCents: 50000}, // $500
    });
    await loginAs(user);
    const addTxPage = new NewTransactionPage(page);
    await addTxPage.goto();
    // Create a split expense where total is $100, user's share is $60.
    await addTxPage.form.addSplitExpense({
      amount: 100,
      ownShareAmount: 60,
      companion: 'Alice',
      datetime: new Date(),
      vendor: "Wendy's",
      category: category.name,
    });

    // Account balance should be reduced by the whole expense ($500 - $100 = $400)
    const overviewPage = new OverviewPage(page);
    await overviewPage.goto();
    await overviewPage.expectTotalBalance('$400');
    // Stats page should show expense as own share ($60)
    const statsPage = new ExpenseStatsPage(page);
    await statsPage.goto();
    await statsPage.selectDuration('Last 6 months');
    // Chart shows 6 months: previous 5 months with no expenses, current month with $60 own share
    await statsPage.expectMonthlyChartAmounts([0, 0, 0, 0, 0, 60]);
  });

  test('change vendor and amount', async ({page, seed, loginAs}) => {
    const {user, account, category} = await seed.createUserWithTestData();
    await seed.createExpense(user.id, account.id, category.id, 30, 'Nero');
    await loginAs(user);
    const listPage = new TransactionListPage(page);
    await listPage.goto();
    const form = await listPage.openEditForm('Nero');
    await form.editExpense({
      amount: 45.5,
      vendor: 'Costa',
    });
    // Refresh the page to see updated data
    await listPage.goto();
    await expect(listPage.getTransactionListItem('Costa')).toBeVisible();
    await expect(listPage.getTransactionListItem('$45.5')).toBeVisible();
    await expect(listPage.getTransactionListItem('Nero')).not.toBeVisible();
  });

  test('change expense category', async ({page, seed, loginAs}) => {
    const {
      user,
      account,
      category: food,
    } = await seed.createUserWithTestData({
      category: {name: 'Food'},
    });
    await seed.createCategory(user.id, {
      name: 'Groceries',
    });
    await seed.createExpense(user.id, account.id, food.id, 25, 'Tesco');
    await loginAs(user);
    const listPage = new TransactionListPage(page);
    await listPage.goto();
    const form = await listPage.openEditForm('Tesco');
    await form.editExpense({category: 'Groceries'});
    await listPage.expectTransactionHasCategory('Tesco', 'Groceries');
  });

  test('change account updates both account balances', async ({
    page,
    seed,
    loginAs,
  }) => {
    const {
      user,
      bank,
      account: current,
      category,
    } = await seed.createUserWithTestData({
      bank: {name: 'Chase'},
      account: {name: 'Current', initialBalanceCents: 50000}, // $500
    });
    await seed.createAccount(user.id, bank.id, {
      name: 'Credit Card',
      initialBalanceCents: 30000, // $300
    });
    await seed.createExpense(user.id, current.id, category.id, 50, 'Chipotle');
    await loginAs(user);
    // Verify initial balances.
    const overviewPage = new OverviewPage(page);
    await overviewPage.goto();
    await overviewPage.expectAccountBalance('Chase', 'Current', '$450');
    await overviewPage.expectAccountBalance('Chase', 'Credit Card', '$300');
    await overviewPage.expectTotalBalance('$750');
    // Edit the expense to use Credit Card instead
    const listPage = new TransactionListPage(page);
    await listPage.goto();
    const form = await listPage.openEditForm('Chipotle');
    await form.editExpense({account: 'Credit Card'});
    await overviewPage.goto();
    await overviewPage.expectAccountBalance('Chase', 'Current', '$500');
    await overviewPage.expectAccountBalance('Chase', 'Credit Card', '$250');
    await overviewPage.expectTotalBalance('$750');
  });
});
