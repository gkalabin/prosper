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
    this.errorMessage = page.getByRole('alert');
  }

  async goto() {
    await this.page.goto(SIGNUP_URL);
  }

  async register(login: string, password: string) {
    await this.loginInput.fill(login);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(password);
    await this.submitButton.click();
    // Wait for server side action to complete
    await expect(this.submitButton).not.toHaveText('Creating account...');
  }

  async expectUserAlreadyExistsError() {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toContainText(
      'User with this login already exists'
    );
  }
}
