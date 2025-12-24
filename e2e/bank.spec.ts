import { test, expect } from '@playwright/test';

test.describe('Bank Account Integration', () => {
  test.skip('should allow a user to link a bank account', async ({ page }) => {
    // This test is skipped because it requires a mock bank API or a real one.
    // 1. Log in.
    // 2. Navigate to the bank accounts page.
    // 3. Click the "link new account" button.
    // 4. Follow the Plaid (or other provider) flow to link an account.
    // 5. Expect to see the newly linked account on the page.
  });

  test.skip('should sync transactions from the linked bank account', async ({ page }) => {
    // This test is skipped because it requires a mock bank API or a real one.
    // 1. Log in and have a linked bank account.
    // 2. Trigger a sync of transactions from the bank.
    // 3. Navigate to the transactions page.
    // 4. Expect to see the transactions from the bank account in the list.
  });
});
