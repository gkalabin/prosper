import {test, expect} from '@playwright/test';
import {LoginPage} from './pages/LoginPage';

test('landing page has title', async ({page}) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Prosper/);
});

test('login page loads inputs', async ({page}) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await expect(loginPage.emailInput).toBeVisible();
  await expect(loginPage.passwordInput).toBeVisible();
  await expect(loginPage.submitButton).toBeVisible();
});
