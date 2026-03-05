import {test} from '../../lib/fixtures/test-base';
import {NewTransactionPage} from '../../pages/NewTransactionPage';
import {TransactionListPage} from '../../pages/TransactionListPage';

test.describe('Income Transaction Form', () => {
  test('new income', async ({page, seed, loginAs}) => {
    const {user} = await seed.createUserWithTestData({
      bank: {name: 'HSBC'},
      account: {name: 'Current'},
      category: {name: 'Salary'},
    });
    await loginAs(user);
    const addTxPage = new NewTransactionPage(page);
    await addTxPage.goto();
    await addTxPage.form.addIncome({
      amount: 1500,
      account: 'HSBC: Current',
      datetime: new Date(),
      payer: 'Acme Corp',
      category: 'Salary',
    });
    const listPage = new TransactionListPage(page);
    await listPage.goto();
    await listPage.expectIncomeTransaction('Acme Corp', {
      amount: '$1,500',
      payer: 'Acme Corp',
      account: 'HSBC: Current',
      category: 'Salary',
    });
  });

  test('edit income', async ({page, seed, loginAs}) => {
    const bundle = await seed.createUserWithTestData({
      bank: {name: 'HSBC'},
      account: {name: 'Current'},
      category: {name: 'Refunds'},
    });
    await seed.income('Google', 120, bundle);
    await seed.createCategory(bundle.user.id, {name: 'Salary'});
    await seed.createAccount(bundle.user.id, bundle.bank.id, {name: 'Card'});
    await loginAs(bundle.user);
    const listPage = new TransactionListPage(page);
    await listPage.goto();
    const form = await listPage.openEditForm('Google');
    await form.editIncome({
      amount: 240,
      payer: 'Meta',
      account: 'Card',
      category: 'Salary',
    });
    await listPage.expectIncomeTransaction('Meta', {
      amount: '$240',
      payer: 'Meta',
      account: 'HSBC: Card',
      category: 'Salary',
    });
  });
});
