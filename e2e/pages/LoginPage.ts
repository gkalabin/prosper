import {type Locator, type Page, expect} from '@playwright/test';

const SIGNIN_URL = '/auth/signin';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Login');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', {name: /sign in|login/i});
  }

  async goto() {
    await this.page.goto(SIGNIN_URL);
  }

  async login(email: string, pass: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(pass);
    await this.submitButton.click();
    // Wait for login to complete, this is done when redirected away from the login page
    await expect(this.page).not.toHaveURL(SIGNIN_URL);
  }
}
