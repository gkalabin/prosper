import {type Locator, expect} from '@playwright/test';
import {format} from 'date-fns';

export class TransactionForm {
  readonly form: Locator;
  readonly expenseTab: Locator;
  readonly incomeTab: Locator;
  readonly amountInput: Locator;
  readonly dateInput: Locator;
  readonly vendorInput: Locator;
  readonly payerInput: Locator;
  readonly categoryField: Locator;
  readonly tagsField: Locator;
  readonly splitTransactionToggle: Locator;
  readonly ownShareAmountInput: Locator;
  readonly companionInput: Locator;
  readonly submitButton: Locator;

  constructor(form: Locator) {
    this.form = form;
    this.expenseTab = form.getByRole('tab', {name: 'Expense'});
    this.incomeTab = form.getByRole('tab', {name: 'Income'});
    this.amountInput = form.getByLabel('Amount');
    this.dateInput = form.getByLabel('Time');
    this.vendorInput = form.getByLabel('Vendor');
    this.payerInput = form.getByLabel('Payer');
    this.categoryField = form.getByRole('combobox', {name: 'Category'});
    this.tagsField = form.getByRole('combobox', {name: 'Tags'});
    this.splitTransactionToggle = form.getByLabel('Split transaction');
    this.ownShareAmountInput = form.getByLabel('My share');
    this.companionInput = form.getByLabel('Shared with');
    this.submitButton = this.form.locator('button[type="submit"]');
  }

  async addExpense({
    amount,
    datetime,
    vendor,
    category,
    tags,
    trip,
  }: {
    amount: number;
    datetime: Date;
    vendor: string;
    category: string;
    tags?: string[];
    trip?: string;
  }) {
    await this.fillCommonFields({amount, datetime, category});
    await this.vendorInput.fill(vendor);
    if (tags) {
      for (const tag of tags) {
        await this.addTag(tag);
      }
    }
    if (trip) {
      await this.form.getByRole('button', {name: 'trip'}).click();
      await this.form.getByLabel('Trip').fill(trip);
    }
    await this.submit();
  }

  async addSplitExpense({
    amount,
    ownShareAmount,
    companion,
    datetime,
    vendor,
    category,
  }: {
    amount: number;
    ownShareAmount: number;
    companion: string;
    datetime: Date;
    vendor: string;
    category: string;
  }) {
    await this.fillCommonFields({amount, datetime, category});
    await this.splitTransactionToggle.click();
    await this.ownShareAmountInput.fill(String(ownShareAmount));
    await this.companionInput.fill(companion);
    await this.vendorInput.fill(vendor);
    await this.submit();
  }

  async addIncome({
    amount,
    datetime,
    payer,
    category,
  }: {
    amount: number;
    datetime: Date;
    payer: string;
    category: string;
  }) {
    await this.incomeTab.click();
    await this.fillCommonFields({amount, datetime, category});
    await this.payerInput.fill(payer);
    await this.submit();
  }

  async editExpense({amount, vendor}: {amount: number; vendor: string}) {
    await this.amountInput.waitFor({state: 'visible'});
    await this.amountInput.fill(String(amount));
    await this.vendorInput.fill(vendor);
    await this.submit();
  }

  private async fillCommonFields({
    amount,
    datetime,
    category,
  }: {
    amount: number;
    datetime: Date;
    category: string;
  }) {
    await this.amountInput.waitFor({state: 'visible'});
    await this.amountInput.fill(String(amount));
    const formattedDatetime = format(datetime, "yyyy-MM-dd'T'HH:mm");
    await this.dateInput.fill(formattedDatetime);
    await this.selectCategory(category);
  }

  async submit() {
    const buttonText = await this.submitButton.textContent();
    const isEditMode = buttonText === 'Update';
    await this.submitButton.click();
    if (isEditMode) {
      // In edit mode, wait for the form to close after successful update.
      await expect(this.form).not.toBeVisible();
    } else {
      // In create mode, wait until the button becomes enabled after being disabled during submission.
      await expect(this.submitButton).not.toBeDisabled();
    }
  }

  async selectCategory(category: string) {
    await this.categoryField.click();
    await this.form.getByRole('option', {name: category}).first().click();
  }

  async addTag(tagName: string) {
    await this.tagsField.click();
    await this.form.getByPlaceholder('Search or create tag...').fill(tagName);
    await this.form.getByRole('option', {name: `Create ${tagName}`}).click();
  }

  async selectExistingTag(tagName: string) {
    await this.tagsField.click();
    await this.form.getByPlaceholder('Search or create tag...').fill(tagName);
    await this.form.getByRole('option', {name: tagName, exact: true}).click();
  }

  async removeTag(tagName: string) {
    await this.form.getByRole('button', {name: `Remove ${tagName}`}).click();
  }
}
