import {v4 as uuidv4} from 'uuid';
import {expect, test} from '../lib/fixtures/test-base';
import {AddTransactionPage} from '../pages/AddTransactionPage';
import {BankConfigPage} from '../pages/BankConfigPage';
import {LoginPage} from '../pages/LoginPage';
import {OverviewPage} from '../pages/OverviewPage';
import {RegisterPage} from '../pages/RegisterPage';

test.describe('Smoke Tests', () => {
  test('login page loads inputs', async ({page}) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test('register and add transaction', async ({page, seed}) => {
    const login = `smoke_test_user_${uuidv4().substring(0, 8)}`;
    const password = 'Password@123';
    const bankName = 'Test Bank';
    const transactionTs = new Date();
    seed.registerUserForCleanup(login);
    // 1. Registration
    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    await registerPage.register(login, password);
    // 2. Bank & Account Setup
    const bankPage = new BankConfigPage(page);
    await bankPage.goto();
    await bankPage.createBank(bankName);
    await bankPage.createAccount(bankName, 'Test Account', 'USD', 0);
    // 3. Add Transaction
    const addTxPage = new AddTransactionPage(page);
    await addTxPage.goto();
    await addTxPage.addExpense({
      amount: 100,
      datetime: transactionTs,
      vendor: 'Starbucks',
      // Using category Eating Out from the initial categories generated for the user on signup.
      category: 'Eating Out',
    });
    // 4. Verification on Overview
    const overviewPage = new OverviewPage(page);
    await overviewPage.goto();
    await overviewPage.expectBalance('-$100');
    await overviewPage.expectExpense('$100');
    await overviewPage.expectIncome('$0');
  });
});
