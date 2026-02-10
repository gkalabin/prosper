import {type Locator, expect} from '@playwright/test';
import {format} from 'date-fns';

type TransferFormData = {
  accountFrom: string;
  accountTo: string;
  amountSent: number;
  category: string;
  amountReceived?: number;
  datetime?: Date;
};

type IncomeFormData = {
  account: string;
  amount: number;
  payer: string;
  category: string;
  datetime?: Date;
  refundForVendor?: string | null;
};

type ThirdPartyExpenseFormData = {
  amount: number;
  datetime: Date;
  vendor: string;
  payer: string;
  category: string;
};

export class TransactionForm {
  readonly form: Locator;
  readonly expenseTab: Locator;
  readonly incomeTab: Locator;
  readonly transferTab: Locator;
  readonly amountInput: Locator;
  readonly amountSentInput: Locator;
  readonly amountReceivedInput: Locator;
  readonly dateInput: Locator;
  readonly vendorInput: Locator;
  readonly payerInput: Locator;
  readonly categoryField: Locator;
  readonly repaymentCategoryField: Locator;
  readonly tagsField: Locator;
  readonly splitTransactionToggle: Locator;
  readonly ownShareAmountInput: Locator;
  readonly companionInput: Locator;
  readonly paidByOtherButton: Locator;
  readonly submitButton: Locator;

  constructor(form: Locator) {
    this.form = form;
    this.expenseTab = form.getByRole('tab', {name: 'Expense'});
    this.incomeTab = form.getByRole('tab', {name: 'Income'});
    this.transferTab = form.getByRole('tab', {name: 'Transfer'});
    this.amountInput = form.getByLabel('Amount');
    this.amountSentInput = form.getByLabel('Amount sent');
    this.amountReceivedInput = form.getByLabel('Amount received');
    this.dateInput = form.getByLabel('Time');
    this.vendorInput = form.getByLabel('Vendor');
    this.payerInput = form.getByLabel('Payer');
    this.categoryField = form.getByRole('combobox', {name: 'Category'});
    this.repaymentCategoryField = form.getByRole('combobox', {
      name: 'Repayment category',
    });
    this.tagsField = form.getByRole('combobox', {name: 'Tags'});
    this.splitTransactionToggle = form.getByLabel('Split transaction');
    this.ownShareAmountInput = form.getByLabel('My share');
    this.companionInput = form.getByLabel('Shared with');
    this.paidByOtherButton = form.getByRole('button', {
      name: 'someone else paid for this expense',
    });
    this.submitButton = form.locator('button[type="submit"]');
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

  async addThirdPartyExpenseDebt(data: ThirdPartyExpenseFormData) {
    await this.expenseTab.click();
    await this.paidByOtherButton.click();
    await this.fillThirdPartyExpenseForm(data);
    await this.submit();
  }

  async editThirdPartyExpenseDebt(data: ThirdPartyExpenseFormData) {
    await this.expenseTab.click();
    await this.fillThirdPartyExpenseForm(data);
    await this.submit();
  }

  async addThirdPartyExpenseWithRepayment(
    data: ThirdPartyExpenseFormData & {
      repaymentCategory: string;
      repaymentAccount: string;
    }
  ) {
    const {repaymentCategory, repaymentAccount} = data;
    await this.expenseTab.click();
    await this.paidByOtherButton.click();
    await this.fillThirdPartyExpenseForm(data);
    await this.form
      .getByRole('button', {name: "I've already paid them back"})
      .click();
    // The label includes the companion name like "I've paid Jane from".
    await this.selectAccount(/I've paid \w+ from/, repaymentAccount);
    await this.selectRepaymentCategory(repaymentCategory);
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
    if (amount !== undefined) {
      await this.amountInput.fill(String(amount));
    }
    if (vendor !== undefined) {
      await this.vendorInput.fill(vendor);
    }
    if (account !== undefined) {
      await this.selectAccount('I paid from', account);
    }
    if (category !== undefined) {
      await this.selectCategory(category);
    }
    await this.submit();
  }

  async addIncome(data: IncomeFormData) {
    await this.incomeTab.click();
    await this.fillIncomeForm(data);
    await this.submit();
  }

  async editIncome(data: IncomeFormData) {
    await this.fillIncomeForm(data);
    await this.submit();
  }

  async addTransfer(data: TransferFormData) {
    await this.transferTab.click();
    await this.fillTransferForm(data);
    await this.submit();
  }

  async editTransfer(data: TransferFormData) {
    await this.fillTransferForm(data);
    await this.submit();
  }

  private async fillIncomeForm({
    amount,
    datetime,
    account,
    category,
    payer,
    refundForVendor,
  }: IncomeFormData) {
    await this.maybeFillDateTime(datetime);
    await this.selectAccount('Money received to', account);
    await this.amountInput.fill(String(amount));
    await this.payerInput.fill(payer);
    await this.selectCategory(category);
    const refundToggle = this.form.getByRole('button', {
      name: 'link the transaction this is the refund for',
    });
    if (refundForVendor) {
      await refundToggle.click();
      // FIXME: button has no accessible name but contains the text
      await this.form.getByText('Select a transaction').click();
      await this.form
        .getByPlaceholder('Search transactions...')
        .fill(refundForVendor);
      await this.form
        .getByRole('option')
        .filter({hasText: refundForVendor})
        .click();
    } else if (refundForVendor == null) {
      await refundToggle.click();
    }
  }

  private async fillTransferForm({
    amountSent,
    amountReceived,
    datetime,
    accountFrom,
    accountTo,
    category,
  }: TransferFormData) {
    await this.maybeFillDateTime(datetime);
    await this.selectAccount('Money sent from', accountFrom);
    await this.selectAccount('Money received to', accountTo);
    // When sent != received fill in 2 different input fields,
    // otherwise it's just the regular "Amount" input.
    if (amountReceived !== undefined) {
      await expect(this.amountReceivedInput).toBeVisible();
      await expect(this.amountSentInput).toBeVisible();
      await this.amountReceivedInput.fill(String(amountReceived));
      await this.amountSentInput.fill(String(amountSent));
    } else {
      await expect(this.amountInput).toBeVisible();
      await this.amountInput.fill(String(amountSent));
    }
    await this.selectCategory(category);
  }

  async fillThirdPartyExpenseForm({
    amount,
    datetime,
    vendor,
    payer,
    category,
  }: ThirdPartyExpenseFormData) {
    await this.amountInput.fill(String(amount));
    this.maybeFillDateTime(datetime);
    await this.selectCategory(category);
    await this.form.getByLabel('This expense was paid by').fill(payer);
    await this.vendorInput.fill(vendor);
  }

  private async maybeFillDateTime(datetime?: Date) {
    if (!datetime) {
      return;
    }
    const formattedDatetime = format(datetime, "yyyy-MM-dd'T'HH:mm");
    await this.dateInput.fill(formattedDatetime);
  }

  private async selectAccount(label: string | RegExp, accountName: string) {
    const selectField = this.form.getByLabel(label);
    const options = await selectField.locator('option').all();
    for (const option of options) {
      const text = await option.textContent();
      if (!text?.includes(accountName)) {
        continue;
      }
      const value = await option.getAttribute('value');
      await selectField.selectOption(value);
      return;
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

  async selectRepaymentCategory(category: string) {
    await this.repaymentCategoryField.click();
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
