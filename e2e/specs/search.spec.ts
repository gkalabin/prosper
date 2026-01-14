import {expect, test} from '../lib/fixtures/test-base';
import {TransactionListPage} from '../pages/TransactionListPage';

test.describe('Transaction Search and Filtering', () => {
  test.describe('Basic Keyword Search', () => {
    test('filters transactions by vendor name', async ({
      page,
      seed,
      loginAs,
    }) => {
      // Given
      const {user, account, category} = await seed.createUserWithTestData();
      await seed.createExpense(
        user.id,
        account.id,
        category.id,
        5.5,
        'Starbucks'
      );
      await seed.createExpense(user.id, account.id, category.id, 25.0, 'Tesco');
      await seed.createExpense(
        user.id,
        account.id,
        category.id,
        12.0,
        'Starbucks'
      );
      await loginAs(user);
      const transactionListPage = new TransactionListPage(page);
      await transactionListPage.goto();
      // When
      await transactionListPage.search('Starbucks');
      // Then
      await expect(
        transactionListPage.getTransactionListItem('Starbucks')
      ).toHaveCount(2);
      await expect(
        transactionListPage.getTransactionListItem('Tesco')
      ).toHaveCount(0);
    });

    test('filters transactions by payer name (income)', async ({
      page,
      seed,
      loginAs,
    }) => {
      // Given
      const {user, account, category} = await seed.createUserWithTestData();
      await seed.createIncome(user.id, account.id, category.id, 3000, 'Google');
      await seed.createIncome(user.id, account.id, category.id, 500, 'Airbnb');
      await seed.createIncome(user.id, account.id, category.id, 2500, 'Google');
      await loginAs(user);
      const listPage = new TransactionListPage(page);
      await listPage.goto();
      // When
      await listPage.search('Google');
      // Then
      await expect(listPage.getTransactionListItem('Google')).toHaveCount(2);
      await expect(listPage.getTransactionListItem('Airbnb')).toHaveCount(0);
    });
  });

  test.describe('Advanced Filters', () => {
    test('filters by amount less than threshold', async ({
      page,
      seed,
      loginAs,
    }) => {
      // Given
      const {user, account, category} = await seed.createUserWithTestData();
      await seed.createExpense(user.id, account.id, category.id, 50, 'Nero');
      await seed.createExpense(user.id, account.id, category.id, 150, 'KFC');
      await seed.createExpense(user.id, account.id, category.id, 75, 'Costa');
      await loginAs(user);
      const listPage = new TransactionListPage(page);
      await listPage.goto();
      // When
      await listPage.search('amount<100');
      // Then
      await expect(listPage.getTransactionListItem('Nero')).toHaveCount(1);
      await expect(listPage.getTransactionListItem('Costa')).toHaveCount(1);
      await expect(listPage.getTransactionListItem('KFC')).toHaveCount(0);
    });

    test('filters by amount greater than threshold', async ({
      page,
      seed,
      loginAs,
    }) => {
      // Given
      const {user, account, category} = await seed.createUserWithTestData();
      await seed.createExpense(user.id, account.id, category.id, 45, 'Boots');
      await seed.createExpense(
        user.id,
        account.id,
        category.id,
        200,
        'John Lewis'
      );
      await seed.createExpense(user.id, account.id, category.id, 150, 'Argos');
      await loginAs(user);
      const listPage = new TransactionListPage(page);
      await listPage.goto();
      // When
      await listPage.search('amount>100');
      // Then
      await expect(listPage.getTransactionListItem('John Lewis')).toHaveCount(
        1
      );
      await expect(listPage.getTransactionListItem('Argos')).toHaveCount(1);
      await expect(listPage.getTransactionListItem('Boots')).toHaveCount(0);
    });

    test('filters by exact amount', async ({page, seed, loginAs}) => {
      // Given
      const {user, account, category} = await seed.createUserWithTestData();
      await seed.createExpense(user.id, account.id, category.id, 50, 'Primark');
      await seed.createExpense(user.id, account.id, category.id, 49.99, 'Zara');
      await seed.createExpense(user.id, account.id, category.id, 50.01, 'H&M');
      await loginAs(user);
      const listPage = new TransactionListPage(page);
      await listPage.goto();
      // When
      await listPage.search('amount=50');
      // Then
      await expect(listPage.getTransactionListItem('Primark')).toHaveCount(1);
      await expect(listPage.getTransactionListItem('Zara')).toHaveCount(0);
      await expect(listPage.getTransactionListItem('H&M')).toHaveCount(0);
    });

    test('filters by date range (before date)', async ({
      page,
      seed,
      loginAs,
    }) => {
      // Given
      const {user, account, category} = await seed.createUserWithTestData();
      await seed.createExpense(
        user.id,
        account.id,
        category.id,
        30,
        'Sainsburys',
        {timestamp: new Date('2025-05-15')}
      );
      await seed.createExpense(
        user.id,
        account.id,
        category.id,
        40,
        'Waitrose',
        {
          timestamp: new Date('2025-06-01'),
        }
      );
      await seed.createExpense(user.id, account.id, category.id, 25, 'Lidl', {
        timestamp: new Date('2025-06-15'),
      });
      await loginAs(user);
      const listPage = new TransactionListPage(page);
      await listPage.goto();
      // When
      await listPage.search('date<=2025-06-01');
      // Then
      await expect(listPage.getTransactionListItem('Sainsburys')).toHaveCount(
        1
      );
      await expect(listPage.getTransactionListItem('Waitrose')).toHaveCount(1);
      await expect(listPage.getTransactionListItem('Lidl')).toHaveCount(0);
    });

    test('filters by date range (after date)', async ({
      page,
      seed,
      loginAs,
    }) => {
      // Given
      const {user, account, category} = await seed.createUserWithTestData();
      await seed.createExpense(user.id, account.id, category.id, 35, 'Aldi', {
        timestamp: new Date('2025-05-20'),
      });
      await seed.createExpense(
        user.id,
        account.id,
        category.id,
        55,
        'Morrisons',
        {timestamp: new Date('2025-06-01')}
      );
      await seed.createExpense(user.id, account.id, category.id, 65, 'Asda', {
        timestamp: new Date('2025-07-10'),
      });
      await loginAs(user);
      const listPage = new TransactionListPage(page);
      await listPage.goto();
      // When
      await listPage.search('date>=2025-06-01');
      // Then
      await expect(listPage.getTransactionListItem('Morrisons')).toHaveCount(1);
      await expect(listPage.getTransactionListItem('Asda')).toHaveCount(1);
      await expect(listPage.getTransactionListItem('Aldi')).toHaveCount(0);
    });

    test('filters by vendor using vendor: prefix', async ({
      page,
      seed,
      loginAs,
    }) => {
      // Given
      const {user, account, category} = await seed.createUserWithTestData();
      await seed.createExpense(
        user.id,
        account.id,
        category.id,
        15,
        "McDonald's"
      );
      await seed.createExpense(
        user.id,
        account.id,
        category.id,
        12,
        'Burger King'
      );
      await seed.createExpense(
        user.id,
        account.id,
        category.id,
        18,
        "McDonald's"
      );
      await loginAs(user);
      const listPage = new TransactionListPage(page);
      await listPage.goto();
      // When
      await listPage.search("vendor:McDonald's");
      // Then
      await expect(listPage.getTransactionListItem("McDonald's")).toHaveCount(
        2
      );
      await expect(listPage.getTransactionListItem('Burger King')).toHaveCount(
        0
      );
    });

    test('combines multiple filters', async ({page, seed, loginAs}) => {
      // Given
      const {user, account, category} = await seed.createUserWithTestData();
      await seed.createExpense(
        user.id,
        account.id,
        category.id,
        5,
        'Starbucks'
      );
      await seed.createExpense(
        user.id,
        account.id,
        category.id,
        15,
        'Starbucks'
      );
      await seed.createExpense(user.id, account.id, category.id, 8, 'Costa');
      await seed.createExpense(
        user.id,
        account.id,
        category.id,
        25,
        'Starbucks'
      );
      await loginAs(user);
      const listPage = new TransactionListPage(page);
      await listPage.goto();
      // When - search for Starbucks transactions over $10
      await listPage.search('Starbucks amount>10');
      // Then - should only find the two Starbucks transactions over $10
      await expect(listPage.getTransactionListItem('Starbucks')).toHaveCount(2);
      await expect(listPage.getTransactionListItem('Costa')).toHaveCount(0);
    });

    test('filters by category', async ({page, seed, loginAs}) => {
      // Given
      const {
        user,
        account,
        category: defaultCategory,
      } = await seed.createUserWithTestData();
      const groceriesCategory = await seed.createCategory(user.id, {
        name: 'Groceries',
      });
      await seed.createExpense(
        user.id,
        account.id,
        groceriesCategory.id,
        45,
        'Tesco'
      );
      await seed.createExpense(
        user.id,
        account.id,
        groceriesCategory.id,
        60,
        'Sainsburys'
      );
      await seed.createExpense(
        user.id,
        account.id,
        defaultCategory.id,
        20,
        'Shell'
      );
      await loginAs(user);
      const listPage = new TransactionListPage(page);
      await listPage.goto();
      // When
      await listPage.search('category:Groceries');
      // Then
      await expect(listPage.getTransactionListItem('Tesco')).toHaveCount(1);
      await expect(listPage.getTransactionListItem('Sainsburys')).toHaveCount(
        1
      );
      await expect(listPage.getTransactionListItem('Shell')).toHaveCount(0);
    });

    test('filters by tag', async ({page, seed, loginAs}) => {
      // Given
      const {user, account, category} = await seed.createUserWithTestData();
      const workTag = await seed.createTag(user.id, 'work');
      const personalTag = await seed.createTag(user.id, 'personal');
      await seed.createExpense(
        user.id,
        account.id,
        category.id,
        120,
        'WHSmith',
        {},
        [workTag.id]
      );
      await seed.createExpense(
        user.id,
        account.id,
        category.id,
        35,
        'Paperchase',
        {},
        [workTag.id]
      );
      await seed.createExpense(
        user.id,
        account.id,
        category.id,
        50,
        'Waterstones',
        {},
        [personalTag.id]
      );
      await loginAs(user);
      const listPage = new TransactionListPage(page);
      await listPage.goto();
      // When
      await listPage.search('tag:work');
      // Then
      await expect(listPage.getTransactionListItem('WHSmith')).toHaveCount(1);
      await expect(listPage.getTransactionListItem('Paperchase')).toHaveCount(
        1
      );
      await expect(listPage.getTransactionListItem('Waterstones')).toHaveCount(
        0
      );
    });
  });

  test.describe('Transaction List Stats', () => {
    test('displays summary statistics for search results', async ({
      page,
      seed,
      loginAs,
    }) => {
      // Given
      const {user, account, category} = await seed.createUserWithTestData();
      await seed.createExpense(
        user.id,
        account.id,
        category.id,
        100,
        'Starbucks'
      );
      await seed.createExpense(
        user.id,
        account.id,
        category.id,
        200,
        'Starbucks'
      );
      await seed.createExpense(user.id, account.id, category.id, 50, 'Nero');
      await loginAs(user);
      const listPage = new TransactionListPage(page);
      await listPage.goto();
      // When
      await listPage.search('Starbucks');
      await listPage.toggleStats();
      // Then - verify the stats summary shows transactions count and totals
      await expect(listPage.getTransactionListItem('Starbucks')).toHaveCount(2);
      // The stats panel should show "Matched 2 transactions"
      await expect(page.getByText('Matched 2 transactions')).toBeVisible();
      // And should show the total expense of $300
      await expect(page.getByText('$300(gross)')).toBeVisible();
    });

    test('displays monthly and yearly totals', async ({
      page,
      seed,
      loginAs,
    }) => {
      // Given - expenses in the current month
      const {user, account, category} = await seed.createUserWithTestData();
      const now = new Date();
      await seed.createExpense(
        user.id,
        account.id,
        category.id,
        150,
        'Netflix',
        {timestamp: now}
      );
      await seed.createExpense(
        user.id,
        account.id,
        category.id,
        250,
        'Spotify',
        {timestamp: now}
      );
      await loginAs(user);
      const listPage = new TransactionListPage(page);
      await listPage.goto();
      await listPage.toggleStats();
      // Then - the page should display the transactions
      await expect(listPage.getTransactionListItem('Netflix')).toHaveCount(1);
      await expect(listPage.getTransactionListItem('Spotify')).toHaveCount(1);
      // Stats should show 2 transactions
      await expect(page.getByText('Matched 2 transactions')).toBeVisible();
      // And show totals with gross/net format
      await expect(page.getByText('$400(gross)')).toBeVisible();
    });
  });
});
