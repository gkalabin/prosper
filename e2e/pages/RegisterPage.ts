import {type Locator, type Page, expect} from '@playwright/test';

const SIGNUP_URL = '/auth/signup';

export class RegisterPage {
  readonly page: Page;
  readonly loginInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.loginInput = page.getByLabel('Login');
    this.passwordInput = page.getByLabel('Password', {exact: true});
    this.confirmPasswordInput = page.getByLabel('Confirm Password');
    this.submitButton = page.getByRole('button', {name: 'Create account'});
    // Be specific to get error message from the form to avoid matching page-wide alerts like Next.js built in errors.
    this.errorMessage = page.locator('form').getByRole('alert');
  }

  async goto() {
    await this.page.goto(SIGNUP_URL);
  }

  async register(login: string, password: string) {
    await this.loginInput.fill(login);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(password);
    await this.submitButton.click();
    // Wait for whatever comes first:
    //   1. Successful registration - page navigates away from signup
    //   2. Error - button becomes enabled again (no longer "Creating account...")
    await Promise.race([
      this.page.waitForURL(url => !url.pathname.includes(SIGNUP_URL)),
      expect(this.errorMessage).toBeVisible(),
    ]);
  }

  async expectUserAlreadyExistsError() {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toContainText(
      'User with this login already exists'
    );
  }
}
