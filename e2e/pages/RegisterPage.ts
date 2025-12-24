import {type Page, type Locator} from '@playwright/test';

export class RegisterPage {
  readonly page: Page;
  readonly loginInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.loginInput = page.getByLabel('Login');
    this.passwordInput = page.getByLabel('Password', {exact: true});
    this.confirmPasswordInput = page.getByLabel('Confirm Password');
    this.submitButton = page.getByRole('button', {name: 'Create account'});
  }

  async goto() {
    await this.page.goto('/auth/signup');
  }

  async register(login: string, password: string) {
    await this.loginInput.fill(login);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(password);
    await this.submitButton.click();
  }
}
