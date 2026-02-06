import {expect, test} from '../../lib/fixtures/test-base';
import {NewTransactionPage} from '../../pages/NewTransactionPage';
import {TransactionListPage} from '../../pages/TransactionListPage';

// TODO: change to fx exchange and back

test.describe('Transfer Transaction Form', () => {
  test('new', async ({page, seed, loginAs}) => {
    const {user, bank} = await seed.createUserWithTestData({
      bank: {name: 'HSBC'},
      account: {name: 'Current'},
      category: {name: 'Transfers'},
    });
    await seed.createAccount(user.id, bank.id, {name: 'Savings'});
    await loginAs(user);
    const addTxPage = new NewTransactionPage(page);
    await addTxPage.goto();
    await addTxPage.form.addTransfer({
      amountSent: 150,
      datetime: new Date(),
      accountFrom: 'Current',
      accountTo: 'Savings',
      category: 'Transfers',
    });
    const listPage = new TransactionListPage(page);
    await listPage.goto();
    // TODO: locating transfer by amount is fragile, find a better, descriptive way.
    await listPage.expectTransferTransaction('$150', {
      accountFrom: 'HSBC: Current',
      accountTo: 'HSBC: Savings',
      amountSent: '$150',
      amountReceived: '$150',
      category: 'Transfers',
    });
  });

  test('new with fx conversion', async ({page, seed, loginAs}) => {
    const {user, bank} = await seed.createUserWithTestData({
      bank: {name: 'Monzo'},
      account: {name: 'USD Current', currencyCode: 'USD'},
      category: {name: 'Transfers'},
    });
    await seed.createAccount(user.id, bank.id, {
      name: 'EUR Current',
      currencyCode: 'EUR',
    });
    await loginAs(user);
    const addTxPage = new NewTransactionPage(page);
    await addTxPage.goto();
    await addTxPage.form.addTransfer({
      amountSent: 100,
      amountReceived: 90,
      datetime: new Date(),
      accountFrom: 'USD Current',
      accountTo: 'EUR Current',
      category: 'Transfers',
    });
    const listPage = new TransactionListPage(page);
    await listPage.goto();
    await listPage.expectTransferTransaction('$100', {
      accountFrom: 'Monzo: USD Current',
      accountTo: 'Monzo: EUR Current',
      category: 'Transfers',
      amountSent: '$100',
      amountReceived: '€ 90',
    });
  });

  test('edit', async ({page, seed, loginAs}) => {
    const {
      user,
      bank,
      category,
      account: current,
    } = await seed.createUserWithTestData({
      bank: {name: 'HSBC'},
      account: {name: 'Current'},
      category: {name: 'Transfers'},
    });
    const checking = await seed.createAccount(user.id, bank.id, {
      name: 'Checking',
    });
    await seed.createCategory(user.id, {
      name: 'Self',
      parentCategoryId: category.id,
    });
    await seed.createTransfer(
      user.id,
      current.id,
      checking.id,
      category.id,
      150
    );
    await loginAs(user);
    const listPage = new TransactionListPage(page);
    await listPage.goto();
    // TODO: locating transfer by amount is fragile, find a better, descriptive way.
    const form = await listPage.openEditForm('$150');
    await form.editTransfer({
      amountSent: 300,
      accountFrom: 'Checking',
      accountTo: 'Current',
      category: 'Self',
    });
    await expect(listPage.getTransactionListItem('$150')).not.toBeVisible();
    await listPage.expectTransferTransaction('$300', {
      accountFrom: 'HSBC: Checking',
      accountTo: 'HSBC: Current',
      category: 'Transfers > Self',
      amountSent: '$300',
      amountReceived: '$300',
    });
  });

  test('edit: single currency to multi', async ({page, seed, loginAs}) => {
    const {
      user,
      bank,
      category,
      account: usd1,
    } = await seed.createUserWithTestData({
      bank: {name: 'Monzo'},
      account: {name: 'USD Current', currencyCode: 'USD'},
      category: {name: 'Transfers'},
    });
    const usd2 = await seed.createAccount(user.id, bank.id, {
      name: 'USD Savings',
      currencyCode: 'EUR',
    });
    await seed.createAccount(user.id, bank.id, {
      name: 'EUR',
      currencyCode: 'EUR',
    });
    await seed.createTransfer(user.id, usd1.id, usd2.id, category.id, 450);
    await loginAs(user);
    const listPage = new TransactionListPage(page);
    await listPage.goto();
    // TODO: locating transfer by amount is fragile, find a better, descriptive way.
    const form = await listPage.openEditForm('$450');
    await form.editTransfer({
      amountSent: 300,
      amountReceived: 280,
      accountFrom: 'USD Current',
      accountTo: 'EUR',
      category: 'Transfers',
    });
    await expect(listPage.getTransactionListItem('$450')).not.toBeVisible();
    await listPage.expectTransferTransaction('$300', {
      accountFrom: 'Monzo: USD Current',
      accountTo: 'Monzo: EUR',
      category: 'Transfers',
      amountSent: '$300',
      amountReceived: '€ 280',
    });
  });

  test('edit: multi currency to single', async ({page, seed, loginAs}) => {
    const {
      user,
      bank,
      category,
      account: usd,
    } = await seed.createUserWithTestData({
      bank: {name: 'Monzo'},
      account: {name: 'USD Current', currencyCode: 'USD'},
      category: {name: 'Transfers'},
    });
    await seed.createAccount(user.id, bank.id, {
      name: 'USD Savings',
      currencyCode: 'USD',
    });
    const eur = await seed.createAccount(user.id, bank.id, {
      name: 'EUR',
      currencyCode: 'EUR',
    });
    await seed.createTransfer(user.id, usd.id, eur.id, category.id, 450);
    await loginAs(user);
    const listPage = new TransactionListPage(page);
    await listPage.goto();
    // TODO: locating transfer by amount is fragile, find a better, descriptive way.
    const form = await listPage.openEditForm('$450');
    await form.editTransfer({
      amountSent: 250,
      accountFrom: 'USD Current',
      accountTo: 'USD Savings',
      category: 'Transfers',
    });
    await expect(listPage.getTransactionListItem('$450')).not.toBeVisible();
    await listPage.expectTransferTransaction('$250', {
      accountFrom: 'Monzo: USD Current',
      accountTo: 'Monzo: USD Savings',
      category: 'Transfers',
      amountSent: '$250',
      amountReceived: '$250',
    });
  });
});
