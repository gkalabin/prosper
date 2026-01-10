import {type Locator, type Page, expect} from '@playwright/test';
import {format} from 'date-fns';

// TODO: this is called Add..., but it is used for updating transactions as well.
// It either should be renamed or split into two classes dependning on what's the most readable
// and looks more natural in the test code.
export class AddTransactionPage {
  readonly page: Page;
  readonly expenseTab: Locator;
  readonly incomeTab: Locator;
  readonly amountInput: Locator;
  readonly dateInput: Locator;
  readonly vendorInput: Locator;
  readonly payerInput: Locator;
  readonly categoryField: Locator;
  readonly tagsField: Locator;
  // TODO: add button is a class field while the update is queried in place. Use a selector to query either of them
  readonly submitButton: Locator;
  readonly splitTransactionToggle: Locator;
  readonly ownShareAmountInput: Locator;
  readonly companionInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.expenseTab = page.getByRole('tab', {name: 'Expense'});
    this.incomeTab = page.getByRole('tab', {name: 'Income'});
    this.amountInput = page.getByLabel('Amount');
    this.dateInput = page.getByLabel('Time');
    this.vendorInput = page.getByLabel('Vendor');
    this.payerInput = page.getByLabel('Payer');
    this.categoryField = page.getByRole('combobox', {name: 'Category'});
    this.tagsField = page.getByRole('combobox', {name: 'Tags'});
    this.submitButton = page.getByRole('button', {name: 'Add'});
    this.splitTransactionToggle = page.getByLabel('Split transaction');
    this.ownShareAmountInput = page.getByLabel('My share');
    this.companionInput = page.getByLabel('Shared with');
  }

  async goto() {
    await this.page.goto('/new');
  }

  async selectCategory(category: string) {
    await this.categoryField.click();
    await this.page.getByRole('option', {name: category}).first().click();
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
    await this.amountInput.waitFor({state: 'visible'});
    await this.amountInput.fill(String(amount));
    const formattedDatetime = format(datetime, "yyyy-MM-dd'T'HH:mm");
    await this.dateInput.fill(formattedDatetime);
    await this.vendorInput.fill(vendor);
    await this.selectCategory(category);
    if (tags) {
      for (const tag of tags) {
        await this.addTag(tag);
      }
    }
    if (trip) {
      // Click the "trip" link to reveal the trip input field
      await this.page.getByRole('button', {name: 'trip'}).click();
      await this.page.getByLabel('Trip').fill(trip);
    }
    await this.submitButton.click();
    // Wait until the button goes back to 'Add' from 'Adding...'
    await expect(this.submitButton).toHaveText('Add');
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
    await this.amountInput.waitFor({state: 'visible'});
    await this.amountInput.fill(String(amount));
    const formattedDatetime = format(datetime, "yyyy-MM-dd'T'HH:mm");
    await this.dateInput.fill(formattedDatetime);
    await this.splitTransactionToggle.click();
    await this.ownShareAmountInput.fill(String(ownShareAmount));
    await this.companionInput.fill(companion);
    await this.vendorInput.fill(vendor);
    await this.selectCategory(category);
    await this.submitCreateForm();
    await this.waitForCreateSubmit();
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
    await this.amountInput.waitFor({state: 'visible'});
    await this.amountInput.fill(String(amount));
    const formattedDatetime = format(datetime, "yyyy-MM-dd'T'HH:mm");
    await this.dateInput.fill(formattedDatetime);
    await this.payerInput.fill(payer);
    await this.selectCategory(category);
    await this.submitCreateForm();
    await this.waitForCreateSubmit();
  }

  async editExpense({amount, vendor}: {amount: number; vendor: string}) {
    // Wait for the dialog form to be ready
    await this.amountInput.waitFor({state: 'visible'});
    await this.amountInput.fill(String(amount));
    await this.vendorInput.fill(vendor);
    await this.submitEditForm();
    await this.waitForEditSubmit();
  }

  // TODO: the next 4 methods are very similar. Unify behind a common selector to simplify implementation.
  async submitCreateForm() {
    await this.submitButton.click();
  }

  async waitForCreateSubmit() {
    // Wait until the button goes back to 'Add' from 'Adding...'
    await expect(this.submitButton).toHaveText('Add');
  }

  async submitEditForm() {
    const updateButton = this.page.getByRole('button', {name: 'Update'});
    await updateButton.click();
  }

  async waitForEditSubmit() {
    // Wait for the dialog to close after successful update
    const dialog = this.page.getByRole('dialog');
    await expect(dialog).not.toBeVisible();
  }

  async addTag(tagName: string) {
    await this.tagsField.click();
    await this.page.getByPlaceholder('Search or create tag...').fill(tagName);
    await this.page.getByRole('option', {name: `Create ${tagName}`}).click();
  }

  async selectExistingTag(tagName: string) {
    await this.tagsField.click();
    await this.page.getByPlaceholder('Search or create tag...').fill(tagName);
    await this.page.getByRole('option', {name: tagName, exact: true}).click();
  }

  async removeTag(tagName: string) {
    // TODO: instead of selecting the selected tag and toggle it off,
    // locate the tag badges and click X icon inside them.
    // Find the dialog containing the edit form
    const dialog = this.page.getByRole('dialog');
    // Open the tags combobox
    await dialog.getByRole('combobox', {name: 'Tags'}).click();
    // Wait for the dropdown options to appear
    const option = dialog.getByRole('option', {name: tagName, exact: true});
    await expect(option).toBeVisible();
    // Click the tag option to deselect it (toggle it off)
    await option.click();
  }
}
