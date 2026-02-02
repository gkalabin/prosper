import {expect, test} from '../../lib/fixtures/test-base';
import {TransactionListPage} from '../../pages/TransactionListPage';

test.describe('Transaction List Search', () => {
  test('by vendor or payer name', async ({page, seed, loginAs}) => {
    const bundle = await seed.createUserWithTestData();
    await seed.newExpenseFromBundle(bundle, 'Starbucks', 5.5);
    await seed.newExpenseFromBundle(bundle, 'Tesco', 25);
    await seed.createIncomeUsingBundle(bundle, 'Starbucks', 12);
    await loginAs(bundle.user);
    const listPage = new TransactionListPage(page);
    await listPage.goto();
    await listPage.search('Starbucks');
    await expect(listPage.getTransactionListItem('Starbucks')).toHaveCount(2);
    await expect(listPage.getTransactionListItem('Tesco')).toHaveCount(0);
  });

  test('by amount', async ({page, seed, loginAs}) => {
    const bundle = await seed.createUserWithTestData();
    await seed.newExpenseFromBundle(bundle, 'Nero', 50);
    await seed.newExpenseFromBundle(bundle, 'KFC', 150);
    await seed.createIncomeUsingBundle(bundle, 'Costa', 75);
    await loginAs(bundle.user);
    const listPage = new TransactionListPage(page);
    await listPage.goto();
    // less than
    await listPage.search('amount<100');
    await expect(listPage.getTransactionListItem('Nero')).toHaveCount(1);
    await expect(listPage.getTransactionListItem('Costa')).toHaveCount(1);
    await expect(listPage.getTransactionListItem('KFC')).toHaveCount(0);
    // greater than
    await listPage.search('amount>100');
    await expect(listPage.getTransactionListItem('Nero')).toHaveCount(0);
    await expect(listPage.getTransactionListItem('Costa')).toHaveCount(0);
    await expect(listPage.getTransactionListItem('KFC')).toHaveCount(1);
    // exact
    await listPage.search('amount=75');
    await expect(listPage.getTransactionListItem('Nero')).toHaveCount(0);
    await expect(listPage.getTransactionListItem('Costa')).toHaveCount(1);
    await expect(listPage.getTransactionListItem('KFC')).toHaveCount(0);
    // no match
    await listPage.search('amount=100');
    await expect(listPage.getTransactionListItem('Nero')).toHaveCount(0);
    await expect(listPage.getTransactionListItem('Costa')).toHaveCount(0);
    await expect(listPage.getTransactionListItem('KFC')).toHaveCount(0);
  });

  test('by date', async ({page, seed, loginAs}) => {
    const bundle = await seed.createUserWithTestData();
    await seed.newExpense('M&S', 30, {timestamp: '2025-05-15', ...bundle});
    await seed.newExpense('Waitrose', 40, {timestamp: '2025-06-01', ...bundle});
    await seed.newExpense('Lidl', 25, {timestamp: '2025-06-15', ...bundle});
    await loginAs(bundle.user);
    const listPage = new TransactionListPage(page);
    await listPage.goto();
    // before
    await listPage.search('date<=2025-06-01');
    await expect(listPage.getTransactionListItem('M&S')).toHaveCount(1);
    await expect(listPage.getTransactionListItem('Waitrose')).toHaveCount(1);
    await expect(listPage.getTransactionListItem('Lidl')).toHaveCount(0);
    // after
    await listPage.search('date>2025-06-01');
    await expect(listPage.getTransactionListItem('M&S')).toHaveCount(0);
    await expect(listPage.getTransactionListItem('Waitrose')).toHaveCount(0);
    await expect(listPage.getTransactionListItem('Lidl')).toHaveCount(1);
    // exact
    await listPage.search('date=2025-06-01');
    await expect(listPage.getTransactionListItem('M&S')).toHaveCount(0);
    await expect(listPage.getTransactionListItem('Waitrose')).toHaveCount(1);
    await expect(listPage.getTransactionListItem('Lidl')).toHaveCount(0);
    // no match
    await listPage.search('date=2025-06-10');
    await expect(listPage.getTransactionListItem('M&S')).toHaveCount(0);
    await expect(listPage.getTransactionListItem('Waitrose')).toHaveCount(0);
    await expect(listPage.getTransactionListItem('Lidl')).toHaveCount(0);
  });

  test('by vendor: prefix', async ({page, seed, loginAs}) => {
    const bundle = await seed.createUserWithTestData();
    await seed.newExpense('KFC', 30, {description: 'KFC rules', ...bundle});
    await seed.newExpense('Rostics', 40, {description: 'Not KFC', ...bundle});
    await seed.newExpense('KFC', 25, {...bundle});
    await loginAs(bundle.user);
    const listPage = new TransactionListPage(page);
    await listPage.goto();
    await listPage.search('vendor:KFC');
    await expect(listPage.getTransactionListItem('KFC')).toHaveCount(2);
    await expect(listPage.getTransactionListItem('Rostics')).toHaveCount(0);
  });

  test('multiple filters', async ({page, seed, loginAs}) => {
    const bundle = await seed.createUserWithTestData();
    await seed.newExpenseFromBundle(bundle, 'Starbucks', 5);
    await seed.newExpenseFromBundle(bundle, 'Starbucks', 15);
    await seed.newExpenseFromBundle(bundle, 'Costa', 8);
    await seed.newExpenseFromBundle(bundle, 'Starbucks', 25);
    await loginAs(bundle.user);
    const listPage = new TransactionListPage(page);
    await listPage.goto();
    await listPage.search('Starbucks amount>10');
    await expect(listPage.getTransactionListItem('Starbucks')).toHaveCount(2);
    await expect(listPage.getTransactionListItem('Costa')).toHaveCount(0);
  });

  test('by category', async ({page, seed, loginAs}) => {
    const {user, account} = await seed.createUserWithTestData();
    const food = await seed.createCategory(user.id, {name: 'Food'});
    const gas = await seed.createCategory(user.id, {name: 'Gas'});
    await seed.createExpense(user.id, account.id, food.id, 45, 'Gastropub');
    await seed.createExpense(user.id, account.id, gas.id, 20, 'Shell');
    await seed.createExpense(user.id, account.id, gas.id, 20, 'BP');
    await loginAs(user);
    const listPage = new TransactionListPage(page);
    await listPage.goto();
    await listPage.search('category:gas');
    await expect(listPage.getTransactionListItem('Shell')).toHaveCount(1);
    await expect(listPage.getTransactionListItem('BP')).toHaveCount(1);
    await expect(listPage.getTransactionListItem('Gastropub')).toHaveCount(0);
  });

  test('by tag', async ({page, seed, loginAs}) => {
    const {user, account, category} = await seed.createUserWithTestData();
    const work = await seed.createTag(user.id, 'work');
    const personal = await seed.createTag(user.id, 'personal');
    await seed.createExpense(
      user.id,
      account.id,
      category.id,
      120,
      'WHSmith',
      {},
      [work.id]
    );
    await seed.createExpense(
      user.id,
      account.id,
      category.id,
      35,
      'Paperchase',
      {},
      [work.id]
    );
    await seed.createExpense(
      user.id,
      account.id,
      category.id,
      50,
      'Waterstones',
      {},
      [personal.id]
    );
    await loginAs(user);
    const listPage = new TransactionListPage(page);
    await listPage.goto();
    await listPage.search('tag:work');
    await expect(listPage.getTransactionListItem('WHSmith')).toHaveCount(1);
    await expect(listPage.getTransactionListItem('Paperchase')).toHaveCount(1);
    await expect(listPage.getTransactionListItem('Waterstones')).toHaveCount(0);
  });
});
