import {expect, test} from '../../../lib/fixtures/test-base';
import {NewTransactionPage} from '../../../pages/NewTransactionPage';

test.describe('Open banking fetch status', () => {
  test('connected account with no fetch shows no suggestions', async ({
    page,
    seed,
    loginAs,
  }) => {
    const {user, bank, account} = await seed.createUserWithTestData();
    await seed.connectOpenBankingAccount({user, bank, account});
    await loginAs(user);
    const addTxPage = new NewTransactionPage(page);
    await addTxPage.goto();
    // Merely connecting the account proposes nothing until it is synced.
    await addTxPage.suggestions.expectAbsent();
  });

  test('connected account whose only fetch errored shows no suggestions', async ({
    page,
    seed,
    loginAs,
  }) => {
    const {user, bank, account} = await seed.createUserWithTestData();
    await seed.openBankingFetchError({
      user,
      bank,
      account,
      error: 'provider unavailable',
    });
    await loginAs(user);
    const addTxPage = new NewTransactionPage(page);
    await addTxPage.goto();
    // A failed fetch records no transactions, so there is nothing to suggest.
    await addTxPage.suggestions.expectAbsent();
  });

  test('a failed fetch after a successful one keeps the earlier suggestions and surfaces the error', async ({
    page,
    seed,
    loginAs,
  }) => {
    const {user, bank, account} = await seed.createUserWithTestData();
    await seed.openBankingTransactions({
      user,
      bank,
      account,
      transactions: [
        {externalId: 'ob-shell-1', description: 'Shell', amount: -60},
      ],
    });
    await seed.openBankingFetchError({
      user,
      bank,
      account,
      error: 'provider unavailable',
    });
    await loginAs(user);
    const addTxPage = new NewTransactionPage(page);
    await addTxPage.goto();
    // The successful fetch's transactions remain proposed despite the later failure.
    await addTxPage.suggestions.expectVisible();
    await expect(page.getByText('Shell', {exact: true})).toBeVisible();
    // The panel reports the failure while still serving the earlier data.
    await addTxPage.suggestions.expectFetchStatus(
      'Last fetch failed with: provider unavailable'
    );
  });
});
