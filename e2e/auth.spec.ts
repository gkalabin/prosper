import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should allow a user to sign up', async ({ page }) => {
    // 1. Navigate to the sign-up page.
    // 2. Fill in the sign-up form with valid credentials.
    // 3. Submit the form.
    // 4. Expect to be redirected to the overview page.
  });

  test('should allow a user to log in', async ({ page }) => {
    // 1. Navigate to the login page.
    // 2. Fill in the login form with valid credentials.
    // 3. Submit the form.
    // 4. Expect to be redirected to the overview page.
  });

  test('should allow a user to log out', async ({ page }) => {
    // 1. Log in programmatically.
    // 2. Click the logout button.
    // 3. Expect to be redirected to the login page.
  });

  test('should show an error on invalid login', async ({ page }) => {
    // 1. Navigate to the login page.
    // 2. Fill in the login form with invalid credentials.
    // 3. Submit the form.
    // 4. Expect to see an error message.
  });
});
