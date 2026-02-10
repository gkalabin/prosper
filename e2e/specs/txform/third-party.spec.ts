import {test} from '../../lib/fixtures/test-base';
import {NewTransactionPage} from '../../pages/NewTransactionPage';
import {TransactionListPage} from '../../pages/TransactionListPage';

// TODO:
//  - edit repayment

test.describe('Third-Party Expenses', () => {
  test('new debt', async ({page, seed, loginAs}) => {
    const {user} = await seed.createUserWithTestData({
      category: {name: 'Dining'},
    });
    await loginAs(user);
    const addTxPage = new NewTransactionPage(page);
    await addTxPage.goto();
    await addTxPage.form.addThirdPartyExpenseDebt({
      amount: 75,
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
    const {user, category} = await seed.createUserWithTestData({
      category: {name: 'Dining'},
    });
    await seed.createThirdPartyExpense(
      user.id,
      category.id,
      80,
      40,
      'USD',
      'KFC',
      'John'
    );
    await loginAs(user);
    const listPage = new TransactionListPage(page);
    await listPage.goto();
    const form = await listPage.openEditForm('KFC');
    await form.editThirdPartyExpenseDebt({
      amount: 90,
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
      amount: 90,
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
});
