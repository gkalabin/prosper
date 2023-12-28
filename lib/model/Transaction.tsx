import { startOfMonth } from "date-fns";
import { Amount, StockAndCurrencyExchange } from "lib/ClientSideModel";
import { TransactionWithExtensions } from "lib/model/AllDatabaseDataModel";
import { BankAccount } from "lib/model/BankAccount";
import { Category } from "lib/model/Category";
import { Currencies, Currency } from "lib/model/Currency";
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

  private readonly exchange: StockAndCurrencyExchange;

  readonly dbValue: TransactionWithExtensions;

  public constructor(
    init: TransactionWithExtensions,
    categoryById: { [id: number]: Category },
    bankAccountById: { [id: number]: BankAccount },
    currencies: Currencies,
    exchange: StockAndCurrencyExchange
  ) {
    this.dbValue = init;
    this.id = init.id;
    this.timestamp = new Date(init.timestamp);
    this.description = init.description;
    this.amountCents = init.amountCents;
    this.category = categoryById[init.categoryId];
    this.exchange = exchange;

    if (init.personalExpense) {
      const bankAccount = bankAccountById[init.personalExpense.accountId];
      this.personalExpense = Object.assign({}, init.personalExpense, {
        account: bankAccount,
      });
      bankAccount.transactions.push(this);
    }

    if (init.thirdPartyExpense) {
      this.thirdPartyExpense = Object.assign({}, init.thirdPartyExpense, {
        currency: currencies.findById(init.thirdPartyExpense.currencyId),
      });
    }
    if (init.transfer) {
      const accountFrom = bankAccountById[init.transfer.accountFromId];
      const accountTo = bankAccountById[init.transfer.accountToId];
      this.transfer = Object.assign({}, init.transfer, {
        accountFrom: accountFrom,
        accountTo: accountTo,
      });
      accountFrom.transactions.push(this);
      accountTo.transactions.push(this);
    }
    if (init.income) {
      const bankAccount = bankAccountById[init.income.accountId];
      this.income = Object.assign({}, init.income, {
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

  isFamilyExpense() {
    if (this.isIncome()) {
      return false;
    }
    const ownShareAmountCents = firstNonNull(
      this.personalExpense,
      this.thirdPartyExpense,
      this.income
    ).ownShareAmountCents;
    return Math.abs(this.amountCents - 2 * ownShareAmountCents) <= 1;
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

  amount() {
    // TODO: cache value in constructor
    return new Amount({
      amountCents: this.amountCents,
      currency: this.currency(),
    });
  }

  monthEpoch() {
    return startOfMonth(this.timestamp).getTime();
  }

  currency() {
    if (this.personalExpense) {
      return this.personalExpense.account.currency;
    }
    if (this.thirdPartyExpense) {
      return this.thirdPartyExpense.currency;
    }
    if (this.transfer) {
      return this.transfer.accountFrom.currency;
    }
    if (this.income) {
      return this.income.account.currency;
    }
    throw new Error(
      `No currency found for transaction: ${JSON.stringify(this, undefined, 2)}`
    );
  }

  amountOwnShare() {
    const extension = firstNonNull(
      this.personalExpense,
      this.thirdPartyExpense,
      this.income
    );
    if (!extension) {
      throw new Error("no extension found");
    }
    return new Amount({
      amountCents: extension.ownShareAmountCents,
      currency: this.currency(),
    });
  }

  amountReceived() {
    return new Amount({
      amountCents: this.transfer.receivedAmountCents,
      currency: this.transfer.accountTo.currency,
    });
  }

  amountSignedCents(ba: BankAccount) {
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

  amountSign() {
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
