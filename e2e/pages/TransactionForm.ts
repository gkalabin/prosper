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

  // TODO: form is a form element, can we type it?
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
    await this.submitAndWaitForCreate();
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
    await this.submitAndWaitForCreate();
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
    await this.submitAndWaitForCreate();
  }

  async editExpense({amount, vendor}: {amount: number; vendor: string}) {
    await this.amountInput.waitFor({state: 'visible'});
    await this.amountInput.fill(String(amount));
    await this.vendorInput.fill(vendor);
    await this.submitAndWaitForEdit();
  }

  /**
   * Fill common form fields shared by all transaction types.
   */
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

  // TODO: instead of matching on specific name, locate the submit button and use it for both create and update.
  async submitAndWaitForCreate() {
    const addButton = this.form.getByRole('button', {name: 'Add'});
    await addButton.click();
    // Wait until the button goes back to 'Add' from 'Adding...'
    await expect(addButton).toHaveText('Add');
  }

  async submitAndWaitForEdit() {
    const updateButton = this.form.getByRole('button', {name: 'Update'});
    await updateButton.click();
    // Wait for the form to close after successful update
    await expect(this.form).not.toBeVisible();
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
    // Open the tags combobox
    await this.tagsField.click();
    // Wait for the dropdown options to appear
    const option = this.form.getByRole('option', {name: tagName, exact: true});
    await expect(option).toBeVisible();
    // Click the tag option to deselect it (toggle it off)
    // TODO: instead click the X button in the tag badge
    await option.click();
  }
}
