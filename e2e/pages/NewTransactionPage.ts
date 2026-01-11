import {type Page} from '@playwright/test';
import {TransactionForm} from './TransactionForm';

export class NewTransactionPage {
  readonly page: Page;
  readonly form: TransactionForm;

  constructor(page: Page) {
    this.page = page;
    this.form = new TransactionForm(page.locator('form'));
  }

  async goto() {
    await this.page.goto('/new');
  }
}
