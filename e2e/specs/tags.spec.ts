import {test} from '../lib/fixtures/test-base';
import {LoginPage} from '../pages/LoginPage';
import {NewTransactionPage} from '../pages/NewTransactionPage';
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
      const addTxPage = new NewTransactionPage(page);
      await addTxPage.goto();
      await addTxPage.form.addExpense({
        amount: 25,
        datetime: new Date(),
        vendor: 'ESSO',
        category: category.name,
        tags: ['gas'],
      });
      // Then: verify tag is created and associated with transaction
      const transactionListPage = new TransactionListPage(page);
      await transactionListPage.goto();
      await transactionListPage.expectTransactionHasTags('ESSO', ['gas']);
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
      const editForm = await transactionListPage.openEditForm('M&S');
      await editForm.removeTag('shops');
      await editForm.addTag('drink');
      await editForm.submitAndWaitForEdit();
      // Refresh the page to see updated data
      await transactionListPage.goto();
      // Then: tags are properly updated
      await transactionListPage.expectTransactionHasTags('M&S', [
        'food',
        'drink',
      ]);
    });
  });
});
