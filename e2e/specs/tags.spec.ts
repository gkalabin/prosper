import {test} from '../lib/fixtures/test-base';
import {AddTransactionPage} from '../pages/AddTransactionPage';
import {LoginPage} from '../pages/LoginPage';
import {TransactionListPage} from '../pages/TransactionListPage';

test.describe('Tags', () => {
  test.describe('Tag Management', () => {
    test('creates a tag when adding to transaction', async ({page, seed}) => {
      // Given: user with bank, account, category
      const user = await seed.createUser();
      const bank = await seed.createBank(user.id);
      await seed.createAccount(user.id, bank.id);
      const category = await seed.createCategory(user.id);
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(user.login, user.rawPassword);
      // When: add expense with a new tag
      const addTxPage = new AddTransactionPage(page);
      await addTxPage.goto();
      await addTxPage.addExpense({
        amount: 25,
        datetime: new Date(),
        vendor: 'ESSO',
        category: category.name,
        tags: ['gas'],
      });
      // Then: verify tag is created and associated with transaction
      const transactionListPage = new TransactionListPage(page);
      await transactionListPage.goto();
      await transactionListPage.expandTransaction('ESSO');
      await transactionListPage.expectExpandedTransactionHasTags('ESSO', [
        'gas',
      ]);
    });

    test('reuses existing tag (case-insensitive)', async () => {
      // TODO: Create user with an existing tag (e.g., "Groceries") via seed
      // TODO: Log in
      // TODO: Navigate to add transaction page
      // TODO: Type the tag name in different case (e.g., "groceries")
      // TODO: Verify existing tag is suggested/selected
      // TODO: Submit form
      // TODO: Verify no duplicate tag is created
    });

    test('adds multiple tags to a single transaction', async () => {
      // TODO: Create user with bank, account, category via seed
      // TODO: Log in
      // TODO: Navigate to add transaction page
      // TODO: Fill transaction details
      // TODO: Add multiple tags
      // TODO: Submit form
      // TODO: Verify all tags are associated with the transaction
    });

    test('edit tags on a transaction', async ({page, seed}) => {
      // Given: transaction with multiple tags
      const user = await seed.createUser();
      const bank = await seed.createBank(user.id);
      const account = await seed.createAccount(user.id, bank.id);
      const category = await seed.createCategory(user.id);
      const tag1 = await seed.createTag(user.id, 'shops');
      const tag2 = await seed.createTag(user.id, 'food');
      await seed.createExpense(
        user.id,
        account.id,
        category.id,
        50,
        'M&S',
        {},
        [tag1.id, tag2.id]
      );
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(user.login, user.rawPassword);
      // When editing the transaction tags
      const transactionListPage = new TransactionListPage(page);
      await transactionListPage.goto();
      await transactionListPage.clickEditTransaction('M&S');
      const editForm = new AddTransactionPage(page);
      await editForm.removeTag('shops');
      await editForm.addTag('drink');
      await editForm.submitEditForm();
      await editForm.waitForEditSubmit();
      // Refresh the page to see updated data
      await transactionListPage.goto();
      // Then: tags are properly updated
      await transactionListPage.expandTransaction('M&S');
      await transactionListPage.expectExpandedTransactionHasTags('M&S', [
        'food',
        'drink',
      ]);
    });

    test('removes single tag from transaction', async () => {
      // TODO: Create user with bank, account, category via seed, transaction with tag
      // TODO: Log in
      // TODO: Navigate to transaction list page
      // TODO: Edit transaction
      // TODO: Remove tag
      // TODO: Submit form
      // TODO: Verify tag is removed from the transaction
    });

    test('removes all tags from transaction', async () => {
      // TODO: Create user with bank, account, category via seed, transaction with multiple tags
      // TODO: Log in
      // TODO: Navigate to transaction list page
      // TODO: Edit transaction
      // TODO: Remove tags
      // TODO: Submit form
      // TODO: Verify tags are removed from the transaction
    });
  });

  test.describe('Tag Filtering', () => {
    test('filters transactions by tag', async () => {
      // TODO: Create user with transactions having different tags via seed
      // TODO: Log in
      // TODO: Navigate to transaction list page
      // TODO: Filter by tag
      // TODO: Verify only transactions with that tag are shown
    });
  });
});
