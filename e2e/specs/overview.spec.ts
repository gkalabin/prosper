import {test} from '../lib/fixtures/test-base';
import {OverviewPage} from '../pages/OverviewPage';

test.describe('Overview Dashboard', () => {
  test.describe('Balance Display', () => {
    test('displays total balance across all accounts', async ({
      page,
      seed,
      loginAs,
    }) => {
      // Given
      const {user, bank, category} = await seed.createUserWithTestData();
      const account1 = await seed.createAccount(user.id, bank.id, {
        name: 'Checking',
      });
      await seed.createIncome(
        user.id,
        account1.id,
        category.id,
        1000,
        'Salary'
      );
      const account2 = await seed.createAccount(user.id, bank.id, {
        name: 'Savings',
      });
      await seed.createIncome(user.id, account2.id, category.id, 500, 'Bonus');
      await loginAs(user);
      // When
      const overviewPage = new OverviewPage(page);
      await overviewPage.goto();
      // Then
      await overviewPage.expectTotalBalance('$1,500');
    });

    test('displays balance in configured display currency', async ({
      page,
      seed,
      loginAs,
    }) => {
      // Given
      const user = await seed.createUser();
      const bank = await seed.createBank(user.id);
      await seed.createAccount(user.id, bank.id, {
        currencyCode: 'USD',
        initialBalanceCents: 100000, // $1000
      });
      await seed.createAccount(user.id, bank.id, {
        currencyCode: 'GBP',
        initialBalanceCents: 100000, // £1000
      });
      await seed.createCategory(user.id);
      await seed.updateDisplaySettings(user.id, {displayCurrencyCode: 'GBP'});
      // Create exchange rate 1 USD = 0.8 GBP
      await seed.createExchangeRate('USD', 'GBP', 0.8);
      await loginAs(user);
      // When
      const overviewPage = new OverviewPage(page);
      await overviewPage.goto();
      // Then: total £1800 - £1000 initial in GBP and £800 converted from $1000
      await overviewPage.expectTotalBalance('£1,800');
    });
  });

  test.describe('Bank and Account List', () => {
    test('displays all banks and their accounts', async ({
      page,
      seed,
      loginAs,
    }) => {
      // Given
      const user = await seed.createUser();
      await seed.createCategory(user.id);
      const bank1 = await seed.createBank(user.id, {name: 'HSBC'});
      await seed.createAccount(user.id, bank1.id, {
        name: 'Current',
        initialBalanceCents: 1000, // $10
      });
      await seed.createAccount(user.id, bank1.id, {
        name: 'Credit Card',
        initialBalanceCents: -1500, // -$15
      });
      const bank2 = await seed.createBank(user.id, {name: 'Monzo'});
      await seed.createAccount(user.id, bank2.id, {
        name: 'Current',
        initialBalanceCents: 3000, // $30
      });
      await loginAs(user);
      // When
      const overviewPage = new OverviewPage(page);
      await overviewPage.goto();
      // Then
      await overviewPage.expectBankWithAccounts('HSBC', [
        'Current',
        'Credit Card',
      ]);
      await overviewPage.expectBankWithAccounts('Monzo', ['Current']);
      await overviewPage.expectTotalBalance('$25');
    });
  });
});
