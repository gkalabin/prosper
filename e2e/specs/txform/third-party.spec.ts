import {test} from '../../lib/fixtures/test-base';
import {NewTransactionPage} from '../../pages/NewTransactionPage';
import {TransactionListPage} from '../../pages/TransactionListPage';

// TODO:
//  - edit repayment
//  - third party expense paid fully by someone else

test.describe('Third-Party Expenses', () => {
  test('new shared debt', async ({page, seed, loginAs}) => {
    const {user} = await seed.createUserWithTestData({
      category: {name: 'Dining'},
    });
    await loginAs(user);
    const addTxPage = new NewTransactionPage(page);
    await addTxPage.goto();
    await addTxPage.form.addThirdPartyExpenseDebt({
      amountFull: 75,
      amountOwn: 37.5,
      datetime: new Date(),
      vendor: 'KFC',
      payer: 'John',
      category: 'Dining',
    });
    const listPage = new TransactionListPage(page);
    await listPage.goto();
    await listPage.expectThirdPartyTransaction('KFC', {
      fullAmount: '$75',
      ownShare: '$37.5',
      vendor: 'KFC',
      category: 'Dining',
      payer: 'John',
    });
  });

  test('edit debt', async ({page, seed, loginAs}) => {
    const bundle = await seed.createUserWithTestData({
      category: {name: 'Dining'},
    });
    await seed.thirdPartyExpense({
      ...bundle,
      vendor: 'KFC',
      payer: 'John',
      fullAmount: 80,
      ownShareAmount: 40,
      currencyCode: 'USD',
    });
    await loginAs(bundle.user);
    const listPage = new TransactionListPage(page);
    await listPage.goto();
    const form = await listPage.openEditForm('KFC');
    await form.editThirdPartyExpenseDebt({
      amountFull: 90,
      amountOwn: 45,
      datetime: new Date(),
      vendor: 'Subway',
      payer: 'Jane',
      category: 'Dining',
    });

    await listPage.expectThirdPartyTransaction('Subway', {
      fullAmount: '$90',
      ownShare: '$45',
      vendor: 'Subway',
      category: 'Dining',
      payer: 'Jane',
    });
  });

  test('new repaid', async ({page, seed, loginAs}) => {
    const {user} = await seed.createUserWithTestData({
      bank: {name: 'HSBC'},
      account: {name: 'Current'},
      category: {name: 'Dining'},
    });
    await seed.createCategory(user.id, {name: 'Repayments'});
    await loginAs(user);
    const addTxPage = new NewTransactionPage(page);
    await addTxPage.goto();
    await addTxPage.form.addThirdPartyExpenseWithRepayment({
      amountFull: 90,
      amountOwn: 45,
      datetime: new Date(),
      vendor: 'Subway',
      payer: 'Jane',
      category: 'Dining',
      repaymentAccount: 'HSBC: Current',
      repaymentCategory: 'Repayments',
    });
    const listPage = new TransactionListPage(page);
    await listPage.goto();
    await listPage.expectThirdPartyTransaction('Subway paid by Jane', {
      fullAmount: '$90',
      ownShare: '$45',
      vendor: 'Subway',
      category: 'Dining',
      payer: 'Jane',
    });
    await listPage.expectExpenseTransaction('Paid back for Subway', {
      // Own share is half the full amount ($90), so the user paid back half of it.
      amount: '$45',
      vendor: 'Jane',
      category: 'Repayments',
      account: 'HSBC: Current',
    });
  });

  test('paid fully by other', async ({page, seed, loginAs}) => {
    const {user} = await seed.createUserWithTestData({
      category: {name: 'Dining'},
    });
    await loginAs(user);
    const addTxPage = new NewTransactionPage(page);
    await addTxPage.goto();
    await addTxPage.form.addThirdPartyExpenseDebt({
      amountFull: 80,
      amountOwn: 80,
      datetime: new Date(),
      vendor: 'KFC',
      payer: 'John',
      category: 'Dining',
    });
    const listPage = new TransactionListPage(page);
    await listPage.goto();
    await listPage.expectThirdPartyTransaction('KFC', {
      fullAmount: '$80',
      ownShare: '$80',
      vendor: 'KFC',
      category: 'Dining',
      payer: 'John',
    });
  });
});
