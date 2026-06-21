import {expect, test} from '../../lib/fixtures/test-base';
import {NewTransactionPage} from '../../pages/NewTransactionPage';
import {OverviewPage} from '../../pages/OverviewPage';
import {TransactionListPage} from '../../pages/TransactionListPage';

test.describe('Create transactions from open banking data', () => {
  test('expense from a withdrawal suggestion', async ({
    page,
    seed,
    loginAs,
  }) => {
    const {user, bank, account, category} = await seed.createUserWithTestData({
      bank: {name: 'HSBC'},
      account: {name: 'Current', initialBalance: 1000},
      category: {name: 'Groceries'},
    });
    await seed.openBankingTransactions({
      user,
      bank,
      account,
      transactions: [
        {
          externalId: 'ob-wf-1',
          description: 'Whole Foods Market',
          amount: -52.4,
        },
        {externalId: 'ob-shell-1', description: 'Shell', amount: -60},
      ],
    });
    await loginAs(user);

    const addTxPage = new NewTransactionPage(page);
    await addTxPage.goto();
    await addTxPage.suggestions.click('Whole Foods Market');
    // The withdrawal pre-fills an expense with its amount and description.
    await expect(addTxPage.form.amountInput).toHaveValue('52.4');
    await expect(addTxPage.form.vendorInput).toHaveValue('Whole Foods Market');
    await addTxPage.form.submit();

    const listPage = new TransactionListPage(page);
    await listPage.goto();
    await listPage.expectExpenseTransaction('Whole Foods Market', {
      amount: '$52.40',
      vendor: 'Whole Foods Market',
      account: 'HSBC: Current',
      category: 'Groceries',
    });

    const overviewPage = new OverviewPage(page);
    await overviewPage.goto();
    await overviewPage.expectAccountBalance('HSBC', 'Current', '$947.60');
    await overviewPage.expectTotalBalance('$948');
  });

  test('income from a deposit suggestion', async ({page, seed, loginAs}) => {
    const {user, bank, account, category} = await seed.createUserWithTestData({
      bank: {name: 'Barclays'},
      account: {name: 'Current', initialBalance: 1000},
      category: {name: 'Salary'},
    });
    await seed.openBankingTransactions({
      user,
      bank,
      account,
      transactions: [
        {externalId: 'ob-pay-1', description: 'ACME PAYROLL', amount: 2500},
        {externalId: 'ob-int-1', description: 'Interest', amount: 12.3},
      ],
    });
    await loginAs(user);

    const addTxPage = new NewTransactionPage(page);
    await addTxPage.goto();
    await addTxPage.suggestions.click('ACME PAYROLL');
    // The deposit pre-fills an income with its amount and payer.
    await expect(addTxPage.form.amountInput).toHaveValue('2500');
    await expect(addTxPage.form.payerInput).toHaveValue('ACME PAYROLL');
    await addTxPage.form.submit();

    const listPage = new TransactionListPage(page);
    await listPage.goto();
    await listPage.expectIncomeTransaction('ACME PAYROLL', {
      amount: '$2,500',
      payer: 'ACME PAYROLL',
      account: 'Barclays: Current',
      category: 'Salary',
    });

    const overviewPage = new OverviewPage(page);
    await overviewPage.goto();
    await overviewPage.expectAccountBalance('Barclays', 'Current', '$3,500');
    await overviewPage.expectTotalBalance('$3,500');
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
    // The paired legs pre-fill a transfer between the two accounts.
    await expect(addTxPage.form.amountInput).toHaveValue('200');
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

    const overviewPage = new OverviewPage(page);
    await overviewPage.goto();
    await overviewPage.expectAccountBalance('Monzo', 'Current', '$300');
    await overviewPage.expectAccountBalance('Monzo', 'Savings', '$300');
    await overviewPage.expectTotalBalance('$600');
  });
});
