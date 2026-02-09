import {test} from '../../lib/fixtures/test-base';
import {NewTransactionPage} from '../../pages/NewTransactionPage';
import {TransactionListPage} from '../../pages/TransactionListPage';

test.describe('Refunds', () => {
  test('link refund', async ({page, seed, loginAs}) => {
    const {user, account, category} = await seed.createUserWithTestData({
      bank: {name: 'Chase'},
      account: {name: 'Current'},
      category: {name: 'Shopping'},
    });
    await seed.createExpense(user.id, account.id, category.id, 100, 'Amazon');
    await seed.createCategory(user.id, {name: 'Refunds'});
    await loginAs(user);
    const addTxPage = new NewTransactionPage(page);
    await addTxPage.goto();
    await addTxPage.form.addIncome({
      amount: 70,
      datetime: new Date(),
      payer: 'Amazon',
      account: 'Chase: Current',
      category: 'Refunds',
      refundForVendor: 'Amazon',
    });
    const listPage = new TransactionListPage(page);
    await listPage.goto();
    await listPage.expectIncomeTransaction('+$70', {
      amount: '$70',
      payer: 'Amazon',
      account: 'Chase: Current',
      category: 'Refunds',
      refundForVendor: 'Amazon',
    });
  });

  test('unlink refund', async ({page, seed, loginAs}) => {
    const {
      user,
      account,
      category: shopping,
    } = await seed.createUserWithTestData({
      bank: {name: 'Chase'},
      account: {name: 'Current'},
      category: {name: 'Shopping'},
    });
    const refunds = await seed.createCategory(user.id, {name: 'Refunds'});
    const expense = await seed.createExpense(
      user.id,
      account.id,
      shopping.id,
      100,
      'Amazon'
    );
    const income = await seed.createIncome(
      user.id,
      account.id,
      refunds.id,
      70,
      'Amazon'
    );
    await seed.createTransactionLink(expense.id, income.id, 'REFUND');
    await loginAs(user);
    const listPage = new TransactionListPage(page);
    await listPage.goto();
    const form = await listPage.openEditForm('+$70');
    await form.editIncome({
      amount: 70,
      account: 'Chase: Current',
      category: 'Refunds',
      payer: 'Amazon',
      refundForVendor: null,
    });
    await listPage.expectIncomeTransactionIsNotRefund('+$70');
    await listPage.expectExpenseTransactionNotRefunded('$100');
  });

  test('multiple refunds', async ({page, seed, loginAs}) => {
    const {user, account, category} = await seed.createUserWithTestData({
      bank: {name: 'Chase'},
      account: {name: 'Current'},
      category: {name: 'Shopping'},
    });
    await seed.createExpense(user.id, account.id, category.id, 100, 'Amazon');
    await seed.createCategory(user.id, {name: 'Refunds'});
    await loginAs(user);
    const addTxPage = new NewTransactionPage(page);
    await addTxPage.goto();
    await addTxPage.form.addIncome({
      amount: 30,
      datetime: new Date(),
      // Using distinct payer name to easier validate the refund links.
      payer: 'Amazon Refund 1',
      account: 'Chase: Current',
      category: 'Refunds',
      refundForVendor: 'Amazon',
    });
    await addTxPage.form.addIncome({
      amount: 40,
      datetime: new Date(),
      payer: 'Amazon Refund 2',
      account: 'Chase: Current',
      category: 'Refunds',
      refundForVendor: 'Amazon',
    });
    const listPage = new TransactionListPage(page);
    await listPage.goto();
    const refundProps = {
      account: 'Chase: Current',
      category: 'Refunds',
      refundForVendor: 'Amazon',
    };
    await listPage.expectIncomeTransaction('Amazon Refund 1', {
      amount: '$30',
      payer: 'Amazon Refund 1',
      ...refundProps,
    });
    await listPage.expectIncomeTransaction('Amazon Refund 2', {
      amount: '$40',
      payer: 'Amazon Refund 2',
      ...refundProps,
    });
    await listPage.expectExpenseTransaction('$100', {
      amount: '$100',
      vendor: 'Amazon',
      account: 'Chase: Current',
      category: 'Shopping',
      refundedIn: ['Amazon Refund 1', 'Amazon Refund 2'],
    });
  });

  test('refund reduces expense amount', async ({page, seed, loginAs}) => {
    const {user, account, category} = await seed.createUserWithTestData({
      bank: {name: 'Chase'},
      account: {name: 'Current'},
      category: {name: 'Shopping'},
    });
    await seed.createExpense(user.id, account.id, category.id, 100, 'Amazon');
    await seed.createCategory(user.id, {name: 'Refunds'});
    await loginAs(user);
    const addTxPage = new NewTransactionPage(page);
    await addTxPage.goto();
    await addTxPage.form.addIncome({
      amount: 70,
      datetime: new Date(),
      payer: 'Amazon',
      account: 'Chase: Current',
      category: 'Refunds',
      refundForVendor: 'Amazon',
    });
    const listPage = new TransactionListPage(page);
    await listPage.goto();
    // TODO: not implemented yet.
    test.fixme();
    await listPage.expectExpenseTransaction('$30', {
      amount: '$30',
      vendor: 'Amazon',
      account: 'Chase: Current',
      category: 'Shopping',
      refundedIn: ['Amazon'],
    });
  });
});
