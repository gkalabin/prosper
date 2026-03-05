import {expect, test} from '../../lib/fixtures/test-base';
import {TransactionListPage} from '../../pages/TransactionListPage';

test.describe('Transaction List Search', () => {
  test('by vendor or payer name', async ({page, seed, loginAs}) => {
    const bundle = await seed.createUserWithTestData();
    await seed.expense('Starbucks', 5.5, bundle);
    await seed.expense('Tesco', 25, bundle);
    await seed.income('Starbucks', 12, bundle);
    await loginAs(bundle.user);
    const listPage = new TransactionListPage(page);
    await listPage.goto();
    await listPage.search('Starbucks');
    await expect(listPage.getTransactionListItem('Starbucks')).toHaveCount(2);
    await expect(listPage.getTransactionListItem('Tesco')).toHaveCount(0);
  });

  test('by amount', async ({page, seed, loginAs}) => {
    const bundle = await seed.createUserWithTestData();
    await seed.expense('Nero', 50, bundle);
    await seed.expense('KFC', 150, bundle);
    await seed.income('Costa', 75, bundle);
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
    await seed.expense('M&S', 30, {...bundle, timestamp: '2025-05-15'});
    await seed.expense('Waitrose', 40, {...bundle, timestamp: '2025-06-01'});
    await seed.expense('Lidl', 25, {...bundle, timestamp: '2025-06-15'});
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
    await seed.expense('KFC', 30, {...bundle, description: 'KFC rules'});
    await seed.expense('Rostics', 40, {...bundle, description: 'Not KFC'});
    await seed.expense('KFC', 25, bundle);
    await loginAs(bundle.user);
    const listPage = new TransactionListPage(page);
    await listPage.goto();
    await listPage.search('vendor:KFC');
    await expect(listPage.getTransactionListItem('KFC')).toHaveCount(2);
    await expect(listPage.getTransactionListItem('Rostics')).toHaveCount(0);
  });

  test('multiple filters', async ({page, seed, loginAs}) => {
    const bundle = await seed.createUserWithTestData();
    await seed.expense('Starbucks', 5, bundle);
    await seed.expense('Starbucks', 15, bundle);
    await seed.expense('Costa', 8, bundle);
    await seed.expense('Starbucks', 25, bundle);
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
    await seed.expense('Gastropub', 45, {user, account, category: food});
    await seed.expense('Shell', 20, {user, account, category: gas});
    await seed.expense('BP', 20, {user, account, category: gas});
    await loginAs(user);
    const listPage = new TransactionListPage(page);
    await listPage.goto();
    await listPage.search('category:gas');
    await expect(listPage.getTransactionListItem('Shell')).toHaveCount(1);
    await expect(listPage.getTransactionListItem('BP')).toHaveCount(1);
    await expect(listPage.getTransactionListItem('Gastropub')).toHaveCount(0);
  });

  test('by tag', async ({page, seed, loginAs}) => {
    const bundle = await seed.createUserWithTestData();
    const work = await seed.createTag(bundle.user.id, 'work');
    const personal = await seed.createTag(bundle.user.id, 'personal');
    await seed.expense('WHSmith', 120, {...bundle, tagIds: [work.id]});
    await seed.expense('Paperchase', 35, {...bundle, tagIds: [work.id]});
    await seed.expense('Waterstones', 50, {...bundle, tagIds: [personal.id]});
    await loginAs(bundle.user);
    const listPage = new TransactionListPage(page);
    await listPage.goto();
    await listPage.search('tag:work');
    await expect(listPage.getTransactionListItem('WHSmith')).toHaveCount(1);
    await expect(listPage.getTransactionListItem('Paperchase')).toHaveCount(1);
    await expect(listPage.getTransactionListItem('Waterstones')).toHaveCount(0);
  });
});
