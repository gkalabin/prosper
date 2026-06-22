import {test} from '../../lib/fixtures/test-base';
import {NewTransactionPage} from '../../pages/NewTransactionPage';
import {TransactionListPage} from '../../pages/TransactionListPage';

test.describe('Create transactions from open banking data', () => {
  test('expense from a withdrawal suggestion', async ({
    page,
    seed,
    loginAs,
  }) => {
    const {user, bank, account} = await seed.createUserWithTestData({
      bank: {name: 'HSBC'},
      account: {name: 'Current', initialBalance: 1000},
      category: {name: 'Gas'},
    });
    await seed.openBankingTransactions({
      user,
      bank,
      account,
      transactions: [
        {externalId: 'ob-shell-1', description: 'Shell', amount: -60},
      ],
    });
    await loginAs(user);
    const addTxPage = new NewTransactionPage(page);
    await addTxPage.goto();
    await addTxPage.suggestions.click('Shell');
    await addTxPage.form.submit();
    const listPage = new TransactionListPage(page);
    await listPage.goto();
    await listPage.expectExpenseTransaction('Shell', {
      amount: '$60',
      vendor: 'Shell',
      account: 'HSBC: Current',
      category: 'Gas',
    });
  });

  test('income from a deposit suggestion', async ({page, seed, loginAs}) => {
    const {user, bank, account} = await seed.createUserWithTestData({
      bank: {name: 'Barclays'},
      account: {name: 'Current', initialBalance: 1000},
      category: {name: 'Salary'},
    });
    await seed.openBankingTransactions({
      user,
      bank,
      account,
      transactions: [
        {externalId: 'ob-pay-1', description: 'Acme Inc.', amount: 2500},
      ],
    });
    await loginAs(user);
    const addTxPage = new NewTransactionPage(page);
    await addTxPage.goto();
    await addTxPage.suggestions.click('Acme Inc.');
    await addTxPage.form.submit();
    const listPage = new TransactionListPage(page);
    await listPage.goto();
    await listPage.expectIncomeTransaction('Acme Inc.', {
      amount: '$2,500',
      payer: 'Acme Inc.',
      account: 'Barclays: Current',
      category: 'Salary',
    });
  });

  test('expense vendor renamed from a raw suggestion description', async ({
    page,
    seed,
    loginAs,
  }) => {
    const {user, bank, account} = await seed.createUserWithTestData({
      bank: {name: 'HSBC'},
      account: {name: 'Current', initialBalance: 1000},
      category: {name: 'Coffee'},
    });
    await seed.openBankingTransactions({
      user,
      bank,
      account,
      transactions: [
        {externalId: 'ob-zettle-1', description: 'Zettle *Starbu', amount: -45},
      ],
    });
    await loginAs(user);
    const addTxPage = new NewTransactionPage(page);
    await addTxPage.goto();
    // With no prior history the suggestion shows the provider's raw description,
    // which pre-fills the vendor and the user cleans up before recording.
    await addTxPage.suggestions.click('Zettle *Starbu');
    await addTxPage.form.vendorInput.fill('Starbucks');
    await addTxPage.form.submit();
    const listPage = new TransactionListPage(page);
    await listPage.goto();
    await listPage.expectExpenseTransaction('Starbucks', {
      amount: '$45',
      vendor: 'Starbucks',
      account: 'HSBC: Current',
      category: 'Coffee',
    });
  });

  test('expense vendor pre-filled from a prior recording', async ({
    page,
    seed,
    loginAs,
  }) => {
    const {user, bank, account} = await seed.createUserWithTestData({
      bank: {name: 'HSBC'},
      account: {name: 'Current', initialBalance: 1000},
      category: {name: 'Coffee'},
    });
    // An earlier fetch surfaces the provider's raw description; the user
    // renames to 'Starbucks' when recording, teaching the server the
    // vendor behind that string.
    await seed.openBankingTransactions({
      user,
      bank,
      account,
      transactions: [
        {
          externalId: 'ob-zettle-old',
          description: 'Zettle *Starbu',
          amount: -80,
        },
      ],
    });
    await loginAs(user);
    const addTxPage = new NewTransactionPage(page);
    await addTxPage.goto();
    await addTxPage.suggestions.click('Zettle *Starbu');
    await addTxPage.form.vendorInput.fill('Starbucks');
    await addTxPage.form.submit();
    // A later fetch replaces the earlier one, so only its transaction is
    // suggested. Having recorded the same raw description as 'Starbucks'
    // before, the user gets the suggestion pre-filled with that vendor.
    await seed.openBankingTransactions({
      user,
      bank,
      account,
      transactions: [
        {
          externalId: 'ob-zettle-new',
          description: 'Zettle *Starbu',
          amount: -45,
        },
      ],
    });
    await addTxPage.goto();
    await addTxPage.suggestions.click('Starbucks');
    await addTxPage.form.submit();

    const listPage = new TransactionListPage(page);
    await listPage.goto();
    // Both Starbucks expenses share a vendor, so the new one is found by its distinct amount.
    await listPage.expectExpenseTransaction('$45', {
      amount: '$45',
      vendor: 'Starbucks',
      account: 'HSBC: Current',
      category: 'Coffee',
    });
  });

  test('transfer from matching withdrawal and deposit suggestions', async ({
    page,
    seed,
    loginAs,
  }) => {
    const {
      user,
      bank,
      account: current,
    } = await seed.createUserWithTestData({
      bank: {name: 'Monzo'},
      account: {name: 'Current', initialBalance: 500, displayOrder: 0},
      category: {name: 'Transfers'},
    });
    const savings = await seed.createAccount(user.id, bank.id, {
      name: 'Savings',
      initialBalance: 100,
      displayOrder: 1,
    });
    // Both legs share the same instant so transfer detection pairs them.
    const movedAt = new Date();
    await seed.openBankingTransactions({
      user,
      bank,
      account: current,
      transactions: [
        {
          externalId: 'ob-out-1',
          description: 'Transfer to savings',
          amount: -200,
          timestamp: movedAt,
        },
      ],
    });
    await seed.openBankingTransactions({
      user,
      bank,
      account: savings,
      transactions: [
        {
          externalId: 'ob-in-1',
          description: 'Transfer from current',
          amount: 200,
          timestamp: movedAt,
        },
      ],
    });
    await loginAs(user);
    const addTxPage = new NewTransactionPage(page);
    await addTxPage.goto();
    await addTxPage.suggestions.click('Transfer to savings');
    await addTxPage.form.submit();
    const listPage = new TransactionListPage(page);
    await listPage.goto();
    await listPage.expectTransferTransaction('$200', {
      accountFrom: 'Monzo: Current',
      accountTo: 'Monzo: Savings',
      amountSent: '$200',
      amountReceived: '$200',
      category: 'Transfers',
    });
  });
});
