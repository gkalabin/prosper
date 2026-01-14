import {expect, test} from '../../lib/fixtures/test-base';
import {ExpenseStatsPage} from '../../pages/ExpenseStatsPage';
import {NewTransactionPage} from '../../pages/NewTransactionPage';
import {TransactionListPage} from '../../pages/TransactionListPage';

test.describe('Refunds', () => {
  test('creates a refund linked to an expense', async ({
    page,
    seed,
    loginAs,
  }) => {
    // Given: User with account and an existing expense ($100 at Amazon)
    const {user, account, category} = await seed.createUserWithTestData({
      bank: {name: 'Chase'},
      account: {name: 'Checking', initialBalanceCents: 20000}, // $200
      category: {name: 'Shopping'},
    });
    await seed.createExpense(user.id, account.id, category.id, 100, 'Amazon');
    await loginAs(user);

    // When: Navigate to add transaction page and create a refund income linked to the Amazon expense
    const addTxPage = new NewTransactionPage(page);
    await addTxPage.goto();
    // Use distinct payer name to differentiate from expense vendor
    await addTxPage.form.addRefundIncome({
      amount: 100,
      datetime: new Date(),
      payer: 'Amazon Refunds',
      category: category.name,
      refundForVendor: 'Amazon',
    });

    // Then: Verify the refund income appears in transaction list (income shows +$)
    const transactionListPage = new TransactionListPage(page);
    await transactionListPage.goto();
    await expect(
      transactionListPage.getTransactionListItem('+$100')
    ).toBeVisible();
    // Verify refund shows the link to the original expense
    await transactionListPage.expectTransactionShowsRefundFor(
      'Amazon Refunds',
      'Amazon'
    );
  });

  // Expected to fail: The app's expense stats page uses 'ownShareAmountCentsIgnoreRefunds'
  // which explicitly ignores refunds when calculating expense amounts. This test documents
  // the expected behavior (refunds should reduce expense amounts in stats) but that feature
  // is not yet implemented.
  test('partial refund reduces expense effective amount', async ({
    page,
    seed,
    loginAs,
  }) => {
    test.fail();

    // Given: User with account and an existing expense ($200 at Electronics Store)
    const {user, account, category} = await seed.createUserWithTestData({
      bank: {name: 'HSBC'},
      account: {name: 'Current', initialBalanceCents: 50000}, // $500
      category: {name: 'Electronics'},
    });
    await seed.createExpense(user.id, account.id, category.id, 200, 'Best Buy');
    await loginAs(user);

    // When: Create a partial refund ($50) linked to the original expense
    const addTxPage = new NewTransactionPage(page);
    await addTxPage.goto();
    // Use distinct payer name to differentiate from expense vendor
    await addTxPage.form.addRefundIncome({
      amount: 50,
      datetime: new Date(),
      payer: 'Best Buy Refunds',
      category: category.name,
      refundForVendor: 'Best Buy',
    });

    // Then: original expense still shows at $200 gross in the transaction list
    const transactionListPage = new TransactionListPage(page);
    await transactionListPage.goto();
    await expect(
      transactionListPage.getTransactionListItem('$200')
    ).toBeVisible();

    // And: Verify the expense shows refund indicator when expanded (use $200 to find expense)
    await transactionListPage.expectTransactionWasRefundedIn(
      '$200',
      'Best Buy Refunds'
    );

    // And: Stats page shows net expense reduced by refund (gross $200, refunded $50 = net $150 own share)
    const statsPage = new ExpenseStatsPage(page);
    await statsPage.goto();
    await statsPage.selectDuration('Last 6 months');
    // Monthly chart shows: 5 months of 0, current month shows $150 (200 - 50 refund)
    await statsPage.expectMonthlyChartAmounts([0, 0, 0, 0, 0, 150]);
  });

  test('displays refund indicator on linked expense', async ({
    page,
    seed,
    loginAs,
  }) => {
    // Given: User with expense and linked refund via seed
    const {user, account, category} = await seed.createUserWithTestData({
      bank: {name: 'Barclays'},
      account: {name: 'Premier', initialBalanceCents: 30000},
      category: {name: 'Clothing'},
    });
    // Use distinct vendor names to avoid substring collision (e.g., 'Nike' matching 'Nike Return')
    const expense = await seed.createExpense(
      user.id,
      account.id,
      category.id,
      80,
      'Nike Store'
    );
    const refund = await seed.createIncome(
      user.id,
      account.id,
      category.id,
      80,
      'Nike Refund'
    );
    await seed.createTransactionLink(expense.id, refund.id, 'REFUND');
    await loginAs(user);

    // When: Navigate to transaction list
    const transactionListPage = new TransactionListPage(page);
    await transactionListPage.goto();

    // Then: Verify the expense shows refund indicator when expanded
    await transactionListPage.expectTransactionWasRefundedIn(
      'Nike Store',
      'Nike Refund'
    );

    // And: Verify the refund shows link to original expense
    // Use +$80 to uniquely identify the income (avoids matching nested 'Nike Refund on...' in expense)
    await transactionListPage.expectTransactionShowsRefundFor(
      '+$80',
      'Nike Store'
    );
  });
});
