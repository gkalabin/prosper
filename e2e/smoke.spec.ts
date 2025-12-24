import {test, expect} from '@playwright/test';
import {LoginPage} from './pages/LoginPage';
import {RegisterPage} from './pages/RegisterPage';
import {BankConfigPage} from './pages/BankConfigPage';
import {AddTransactionPage} from './pages/AddTransactionPage';
import {OverviewPage} from './pages/OverviewPage';
import {v4 as uuidv4} from 'uuid';

test.describe('Smoke Tests', () => {
  test('login page loads inputs', async ({page}) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test('balance is updated after adding transaction by a newly created user', async ({
    page,
  }) => {
    const username = `user_${uuidv4().substring(0, 8)}`;
    const email = `${username}@example.com`;
    const password = 'Password@123';
    const bankName = 'Test Bank';
    const accountName = 'Test Account';
    // 1. Registration
    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    await registerPage.register(email, password);
    // Wait for registration to complete (redirect away from signup)
    await expect(page).not.toHaveURL(/.*\/auth\/signup/);
    // 2. Bank & Account Setup
    const bankPage = new BankConfigPage(page);
    await bankPage.goto();
    await bankPage.createBank(bankName);
    await bankPage.createAccount(bankName, accountName, 'USD', 0);
    // 3. Add Transaction
    const addTxPage = new AddTransactionPage(page);
    await addTxPage.goto();
    const now = new Date();
    await addTxPage.addExpense(100, now);
    // 4. Verification on Overview
    const overviewPage = new OverviewPage(page);
    await overviewPage.goto();
    await overviewPage.expectBalance('-$100');
    await overviewPage.expectExpense('$100');
    await overviewPage.expectIncome('$0');
  });
});
