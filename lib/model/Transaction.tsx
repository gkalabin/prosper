import { TransactionWithExtensions } from "../ServerSideDB";
import { BankAccount } from "./BankAccount";
import { Category } from "./Category";
import { Currency } from "./Currency";
// import { assert } from "console";

export type PersonalExpense = {
  vendor: string;
  ownShareAmountCents: number;
  account: BankAccount;
};

export type Income = {
  vendor: string;
  ownShareAmountCents: number;
  account: BankAccount;
};

export type Transfer = {
  receivedAmountCents: number;
  accountFrom: BankAccount;
  accountTo: BankAccount;
};

export type ThirdPartyExpense = {
  vendor: string;
  ownShareAmountCents: number;
  currency: Currency;
  payer: string;
  // TODO: trip
};

export class Transaction {
  readonly id: number;
  readonly timestamp: Date;
  readonly description: string;
  readonly amountCents: number;
  readonly category: Category;

  private personalExpense?: PersonalExpense;
  readonly thirdPartyExpense?: ThirdPartyExpense;
  private income?: Income;
  private transfer?: Transfer;

  public constructor(
    {
      id,
      timestamp,
      description,
      amountCents,
      categoryId,
      personalExpense,
      thirdPartyExpense,
      income,
      transfer,
    }: TransactionWithExtensions,
    categoryById: { [id: number]: Category },
    bankAccountById: { [id: number]: BankAccount },
    currencyById: { [id: number]: Currency }
  ) {
    this.id = id;
    this.timestamp = new Date(timestamp);
    this.description = description;
    this.amountCents = amountCents;
    this.category = categoryById[categoryId];

    this.thirdPartyExpense = null;
    this.income = null;
    this.transfer = null;
    if (personalExpense) {
      const bankAccount = bankAccountById[personalExpense.accountId];
      this.personalExpense = Object.assign({}, personalExpense, {
        account: bankAccount,
        dbValue: personalExpense,
      });
      bankAccount.transactions.push(this);
    }

    if (thirdPartyExpense) {
      this.thirdPartyExpense = Object.assign({}, thirdPartyExpense, {
        currency: currencyById[thirdPartyExpense.currencyId],
      });
    }
    if (transfer) {
      const accountFrom = bankAccountById[transfer.accountFromId];
      const accountTo = bankAccountById[transfer.accountToId];
      this.transfer = Object.assign({}, transfer, {
        accountFrom: accountFrom,
        accountTo: accountTo,
      });
      accountFrom.transactions.push(this);
      accountTo.transactions.push(this);
    }
    if (income) {
      const bankAccount = bankAccountById[income.accountId];
      this.income = Object.assign({}, income, {
        account: bankAccount,
      });
      bankAccount.transactions.push(this);
    }
  }

  isPersonalExpense() {
    return !!this.personalExpense;
  }
  isThirdPartyExpense() {
    return !!this.thirdPartyExpense;
  }
  isIncome() {
    return !!this.income;
  }
  isTransfer() {
    return !!this.transfer;
  }

  accountFrom() {
    return this.personalExpense?.account ?? this.transfer?.accountFrom;
  }

  accountTo() {
    return this.income?.account ?? this.transfer?.accountTo;
  }

  vendor() {
    return firstNonNull(
      this.personalExpense,
      this.thirdPartyExpense,
      this.income
    )?.vendor;
  }

  absoluteAmount(ba: BankAccount): number {
    if (!this.belongsToAccount(ba)) {
      console.warn(`Transaction doesn't belong to the account`, this, ba);
      return 0;
    }
    if (this.personalExpense) {
      return -this.amountCents;
    }
    if (this.income) {
      return this.amountCents;
    }
    const transfer = this.transfer;
    // assert(transfer)
    if (transfer.accountFrom.id == ba.id) {
      return -this.amountCents;
    }
    // assert(transfer.accountTo.id == ba.id)
    return transfer.receivedAmountCents;
  }

  amountSign(): number {
    if (this.personalExpense || this.thirdPartyExpense) {
      return -1;
    }
    if (this.income) {
      return 1;
    }
    return 0;
  }

  private belongsToAccount(ba: BankAccount): boolean {
    if (this.income && this.income.account.id == ba.id) {
      return true;
    }
    if (this.personalExpense && this.personalExpense.account.id == ba.id) {
      return true;
    }
    if (
      this.transfer &&
      (this.transfer.accountFrom.id == ba.id ||
        this.transfer.accountTo.id == ba.id)
    ) {
      return true;
    }
    return false;
  }

  valid() {
    const extensions = [
      this.personalExpense,
      this.thirdPartyExpense,
      this.income,
      this.transfer,
    ];
    const definedExtensions = extensions.filter((x) => !!x);
    if (definedExtensions.length != 1) {
      console.error(
        this,
        `Want only one extension, but got ${definedExtensions.length}`,
        definedExtensions
      );
      return false;
    }
    return true;
  }
}

function firstNonNull(a: PersonalExpense, b: ThirdPartyExpense, c: Income) {
  return a ?? b ?? c;
}
