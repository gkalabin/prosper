import {type Locator, expect} from '@playwright/test';
import {format} from 'date-fns';

export class TransactionForm {
  readonly form: Locator;
  readonly expenseTab: Locator;
  readonly incomeTab: Locator;
  readonly transferTab: Locator;
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
  readonly descriptionInput: Locator;
  readonly amountReceivedInput: Locator;

  constructor(form: Locator) {
    this.form = form;
    this.expenseTab = form.getByRole('tab', {name: 'Expense'});
    this.incomeTab = form.getByRole('tab', {name: 'Income'});
    this.transferTab = form.getByRole('tab', {name: 'Transfer'});
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
    this.descriptionInput = form.getByLabel('Description');
    this.amountReceivedInput = form.getByLabel('Amount received');
  }

  async addExpense({
    amount,
    datetime,
    vendor,
    category,
    tags,
    trip,
    note,
  }: {
    amount: number;
    datetime: Date;
    vendor: string;
    category: string;
    tags?: string[];
    trip?: string;
    note?: string;
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
    if (note) {
      await this.form.getByRole('button', {name: 'note'}).click();
      await this.descriptionInput.fill(note);
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

  async addRefundIncome({
    amount,
    datetime,
    payer,
    category,
    refundForVendor,
  }: {
    amount: number;
    datetime: Date;
    payer: string;
    category: string;
    refundForVendor: string;
  }) {
    await this.incomeTab.click();
    await this.fillCommonFields({amount, datetime, category});
    await this.payerInput.fill(payer);
    // Click the link to show parent transaction
    await this.form
      .getByRole('button', {
        name: 'link the transaction this is the refund for',
      })
      .click();
    // Select the parent transaction - button has no accessible name but contains the text
    await this.form.getByText('Select a transaction').click();
    await this.form
      .getByPlaceholder('Search transactions...')
      .fill(refundForVendor);
    await this.form
      .getByRole('option')
      .filter({hasText: refundForVendor})
      .first()
      .click();
    await this.submit();
  }

  async addThirdPartyExpense({
    amount,
    datetime,
    vendor,
    payer,
    category,
  }: {
    amount: number;
    datetime: Date;
    vendor: string;
    payer: string;
    category: string;
  }) {
    await this.expenseTab.click();
    await this.fillCommonFields({amount, datetime, category});
    // Click "someone else paid for this expense" link
    await this.form
      .getByRole('button', {name: 'someone else paid for this expense'})
      .click();
    // Fill payer name using the "This expense was paid by" field
    await this.form.getByLabel('This expense was paid by').fill(payer);
    await this.vendorInput.fill(vendor);
    await this.submit();
  }

  async addThirdPartyExpenseWithRepayment({
    amount,
    datetime,
    vendor,
    payer,
    category,
    repaymentAccount,
  }: {
    amount: number;
    datetime: Date;
    vendor: string;
    payer: string;
    category: string;
    repaymentAccount: string;
  }) {
    // Wait for the form to be ready before interacting
    await this.expenseTab.waitFor({state: 'visible'});
    await this.expenseTab.click();
    await this.fillCommonFields({amount, datetime, category});
    // Click "someone else paid for this expense" link
    await this.form
      .getByRole('button', {name: 'someone else paid for this expense'})
      .click();
    // Fill payer name
    await this.form.getByLabel('This expense was paid by').fill(payer);
    // Click to add repayment
    await this.form.getByRole('button', {name: 'add repayment'}).click();
    // Select repayment account
    await this.selectAccount('Repaid from', repaymentAccount);
    await this.vendorInput.fill(vendor);
    await this.submit();
  }

  async editExpense({
    amount,
    vendor,
    account,
    category,
  }: {
    amount?: number;
    vendor?: string;
    account?: string;
    category?: string;
  }) {
    await this.amountInput.waitFor({state: 'visible'});
    if (amount !== undefined) {
      await this.amountInput.fill(String(amount));
    }
    if (vendor !== undefined) {
      await this.vendorInput.fill(vendor);
    }
    if (account !== undefined) {
      await this.selectAccount('Paid from', account);
    }
    if (category !== undefined) {
      await this.selectCategory(category);
    }
    await this.submit();
  }

  async editIncome({
    amount,
    payer,
    account,
  }: {
    amount?: number;
    payer?: string;
    account?: string;
  }) {
    await this.amountInput.waitFor({state: 'visible'});
    if (amount !== undefined) {
      await this.amountInput.fill(String(amount));
    }
    if (payer !== undefined) {
      await this.payerInput.fill(payer);
    }
    if (account !== undefined) {
      await this.selectAccount('Money received to', account);
    }
    await this.submit();
  }

  async addTransfer({
    amount,
    datetime,
    fromAccount,
    toAccount,
    category,
  }: {
    amount: number;
    datetime: Date;
    fromAccount: string;
    toAccount: string;
    category: string;
  }) {
    await this.transferTab.click();
    await this.amountInput.waitFor({state: 'visible'});
    await this.amountInput.fill(String(amount));
    const formattedDatetime = format(datetime, "yyyy-MM-dd'T'HH:mm");
    await this.dateInput.fill(formattedDatetime);
    await this.selectAccount('Money sent from', fromAccount);
    await this.selectAccount('Money received to', toAccount);
    await this.selectCategory(category);
    await this.submit();
  }

  async addCrossCurrencyTransfer({
    amount,
    amountReceived,
    datetime,
    fromAccount,
    toAccount,
    category,
  }: {
    amount: number;
    amountReceived: number;
    datetime: Date;
    fromAccount: string;
    toAccount: string;
    category: string;
  }) {
    await this.transferTab.click();
    await this.amountInput.waitFor({state: 'visible'});
    await this.amountInput.fill(String(amount));
    const formattedDatetime = format(datetime, "yyyy-MM-dd'T'HH:mm");
    await this.dateInput.fill(formattedDatetime);
    await this.selectAccount('Money sent from', fromAccount);
    await this.selectAccount('Money received to', toAccount);
    await this.amountReceivedInput.fill(String(amountReceived));
    await this.selectCategory(category);
    await this.submit();
  }

  async editTransfer({
    amount,
    amountReceived,
    fromAccount,
    toAccount,
  }: {
    amount?: number;
    amountReceived?: number;
    fromAccount?: string;
    toAccount?: string;
  }) {
    await this.amountInput.waitFor({state: 'visible'});
    if (amount !== undefined) {
      await this.amountInput.fill(String(amount));
    }
    if (amountReceived !== undefined) {
      await this.amountReceivedInput.fill(String(amountReceived));
    }
    if (fromAccount !== undefined) {
      await this.selectAccount('Money sent from', fromAccount);
    }
    if (toAccount !== undefined) {
      await this.selectAccount('Money received to', toAccount);
    }
    await this.submit();
  }

  async selectAccount(label: string, accountName: string) {
    const selectField = this.form.getByLabel(label);
    // Get all options and find one that contains the account name
    const options = await selectField.locator('option').all();
    for (const option of options) {
      const text = await option.textContent();
      if (text && text.includes(accountName)) {
        const value = await option.getAttribute('value');
        if (value) {
          await selectField.selectOption(value);
          return;
        }
      }
    }
    throw new Error(`Account "${accountName}" not found in dropdown`);
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
      // In create mode, wait for the button text to change from "Adding…" to "Add"
      // This indicates the full submit cycle completed (request sent, response received, form reset)
      await expect(this.submitButton).toHaveText('Add', {timeout: 10000});
      // Additional small wait for state to settle before navigating away
      await this.form.page().waitForTimeout(100);
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
