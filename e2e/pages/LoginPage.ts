import {type Page, type Locator} from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // Using semantic locators which are implementation-agnostic
    this.emailInput = page.getByLabel('Login');
    // Fallback to placeholder if label is missing, but prefer label
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', {name: /sign in|login/i});
  }

  async goto() {
    await this.page.goto('/auth/signin');
  }

  async login(email: string, pass: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(pass);
    await this.submitButton.click();
  }
}
