import {type Locator, type Page, expect} from '@playwright/test';

const SIGNIN_URL = '/auth/signin';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Login');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', {name: /sign in|login/i});
    this.errorMessage = page.locator('form').getByRole('alert');
  }

  async goto() {
    await this.page.goto(SIGNIN_URL);
  }

  async login(email: string, pass: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(pass);
    await this.submitButton.click();
    // Wait for login to complete, this is done when redirected away from the login page.
    // Use a longer timeout to handle slower server responses during concurrent test execution.
    await expect(this.page).not.toHaveURL(SIGNIN_URL, {timeout: 15000});
  }

  async attemptLogin(email: string, pass: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(pass);
    await this.submitButton.click();
  }

  async expectLoginError(expectedMessage: string) {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toContainText(expectedMessage);
  }

  async attemptLogin(email: string, pass: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(pass);
    await this.submitButton.click();
  }

  async expectLoginError(expectedMessage: string) {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toContainText(expectedMessage);
  }
}
