import {test} from '../../lib/fixtures/test-base';
import {NewTransactionPage} from '../../pages/NewTransactionPage';
import {TransactionListPage} from '../../pages/TransactionListPage';

test.describe('Tags', () => {
  test('creates a tag when adding to transaction', async ({
    page,
    seed,
    loginAs,
  }) => {
    // Given: user with bank, account, category
    const {user, category} = await seed.createUserWithTestData();
    await loginAs(user);
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
    // Then: tag is created and associated with transaction
    const transactionListPage = new TransactionListPage(page);
    await transactionListPage.goto();
    await transactionListPage.expectTransactionHasTags('ESSO', ['gas']);
  });

  test('edit tags on a transaction', async ({page, seed, loginAs}) => {
    // Given: transaction with multiple tags
    const {user, account, category} = await seed.createUserWithTestData();
    const tag1 = await seed.createTag(user.id, 'shops');
    const tag2 = await seed.createTag(user.id, 'food');
    await seed.createExpense(user.id, account.id, category.id, 50, 'M&S', {}, [
      tag1.id,
      tag2.id,
    ]);
    await loginAs(user);
    // When editing the transaction tags
    const transactionListPage = new TransactionListPage(page);
    await transactionListPage.goto();
    const editForm = await transactionListPage.openEditForm('M&S');
    await editForm.removeTag('shops');
    await editForm.addTag('drink');
    await editForm.submit();
    // Refresh the page to see updated data
    await transactionListPage.goto();
    // Then: tags are properly updated
    await transactionListPage.expectTransactionHasTags('M&S', [
      'food',
      'drink',
    ]);
  });
});
