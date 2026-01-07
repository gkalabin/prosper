import {test} from '../lib/fixtures/test-base';
import {LoginPage} from '../pages/LoginPage';
import {OverviewPage} from '../pages/OverviewPage';

test.describe('Overview Dashboard', () => {
  test.describe('Balance Display', () => {
    test('displays total balance across all accounts', async ({page, seed}) => {
      // Given
      const user = await seed.createUser();
      const bank = await seed.createBank(user.id);
      const account1 = await seed.createAccount(user.id, bank.id, {
        name: 'Checking',
      });
      const category = await seed.createCategory(user.id);
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
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(user.login, user.rawPassword);
      // When
      const overviewPage = new OverviewPage(page);
      await overviewPage.goto();
      // Then
      await overviewPage.expectBalance('$1,500');
    });
  });

  test.describe('Bank and Account List', () => {
    test('displays all banks and their accounts', async ({page, seed}) => {
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
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(user.login, user.rawPassword);
      // When
      const overviewPage = new OverviewPage(page);
      await overviewPage.goto();
      // Then
      await overviewPage.expectBankWithAccounts('HSBC', [
        'Current',
        'Credit Card',
      ]);
      await overviewPage.expectBankWithAccounts('Monzo', ['Current']);
      await overviewPage.expectBalance('$25');
    });
  });
});
