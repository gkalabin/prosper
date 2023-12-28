import { Amount } from "lib/Amount";
import { AmountWithCurrency } from "lib/AmountWithCurrency";
import { AmountWithUnit } from "lib/AmountWithUnit";
import { StockAndCurrencyExchange } from "lib/ClientSideModel";
import { TransactionWithExtensionsAndTagIds } from "lib/model/AllDatabaseDataModel";
import { BankAccount } from "lib/model/BankAccount";
import { Category } from "lib/model/Category";
import { Currency } from "lib/model/Currency";
import { Stock } from "lib/model/Stock";
import { Tag } from "lib/model/Tag";
import { TransactionType } from "lib/model/TransactionType";
import { Trip } from "lib/model/Trip";
import { Unit } from "lib/model/Unit";

export type PersonalExpense = {
  vendor: string;
  otherPartyName: string;
  ownShareAmountCents: number;
  account: BankAccount;
  trip?: Trip;
};

export type Income = {
  payer: string;
  ownShareAmountCents: number;
  account: BankAccount;
  otherPartyName: string;
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
  trip?: Trip;
};

export class Transaction {
  readonly id: number;
  readonly timestamp: Date;
  readonly description: string;
  readonly amountCents: number;
  readonly category: Category;
  private readonly _tags: Tag[];
  private readonly _parentTransactionId?: number;

  private readonly personalExpense?: PersonalExpense;
  private readonly thirdPartyExpense?: ThirdPartyExpense;
  private readonly income?: Income;
  private readonly transfer?: Transfer;

  private readonly exchange: StockAndCurrencyExchange;

  readonly dbValue: TransactionWithExtensionsAndTagIds;

  public constructor(
    init: TransactionWithExtensionsAndTagIds,
    categoryById: { [id: number]: Category },
    bankAccountById: { [id: number]: BankAccount },
    tripById: Map<number, Trip>,
    tagById: Map<number, Tag>,
    exchange: StockAndCurrencyExchange
  ) {
    this.dbValue = init;
    this.id = init.id;
    this.timestamp = new Date(init.timestamp);
    this.description = init.description;
    this.amountCents = init.amountCents;
    this.category = categoryById[init.categoryId];
    this.exchange = exchange;
    this._tags = init.tags?.length
      ? init.tags.map(({ id }) => tagById.get(id))
      : [];
    this._parentTransactionId = init.transactionToBeRepayedId;

    if (init.personalExpense) {
      const bankAccount = bankAccountById[init.personalExpense.accountId];
      this.personalExpense = {
        ...init.personalExpense,
        account: bankAccount,
        trip: tripById.get(init.personalExpense.tripId),
      };
      bankAccount.transactions.push(this);
    }

    if (init.thirdPartyExpense) {
      this.thirdPartyExpense = {
        ...init.thirdPartyExpense,
        currency: Currency.findByCode(init.thirdPartyExpense.currencyCode),
        trip: tripById.get(init.thirdPartyExpense.tripId),
      };
    }
    if (init.transfer) {
      const accountFrom = bankAccountById[init.transfer.accountFromId];
      const accountTo = bankAccountById[init.transfer.accountToId];
      this.transfer = {
        ...init.transfer,
        accountFrom: accountFrom,
        accountTo: accountTo,
      };
      accountFrom.transactions.push(this);
      accountTo.transactions.push(this);
    }
    if (init.income) {
      const bankAccount = bankAccountById[init.income.accountId];
      this.income = { ...init.income, account: bankAccount };
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

  tags() {
    return this._tags;
  }

  hasTag(tagName: string) {
    return this._tags.some((tag) => tag.name() == tagName);
  }

  hasParentTransaction() {
    return !!this._parentTransactionId;
  }

  parentTransactionId() {
    return this._parentTransactionId;
  }

  isShared() {
    if (this.isTransfer()) {
      return false;
    }
    const ownShareAmountCents = firstNonNull3(
      this.personalExpense,
      this.thirdPartyExpense,
      this.income
    ).ownShareAmountCents;
    return this.amountCents != ownShareAmountCents;
  }

  hasAccountFrom() {
    return this.isPersonalExpense() || this.isTransfer();
  }

  accountFrom() {
    return this.personalExpense?.account ?? this.transfer?.accountFrom;
  }

  hasAccountTo() {
    return this.isIncome() || this.isTransfer();
  }

  accountTo() {
    return this.income?.account ?? this.transfer?.accountTo;
  }

  private vendorOrNull() {
    return (
      firstNonNull2(this.personalExpense, this.thirdPartyExpense)?.vendor ??
      null
    );
  }

  hasVendor() {
    return this.vendorOrNull() != null;
  }

  vendor() {
    if (!this.hasVendor()) {
      throw new Error(`Transaction ${this.id} has no vendor`);
    }
    return this.vendorOrNull();
  }

  private otherPartyNameOrNull() {
    return (
      // Treat empty other party as null because you cannot split transaction with empty other party.
      firstNonNull2(this.personalExpense, this.income)?.otherPartyName || null
    );
  }

  hasOtherParty() {
    return this.otherPartyNameOrNull() != null;
  }

  otherParty() {
    if (!this.hasOtherParty()) {
      throw new Error(`Transaction ${this.id} has no other party`);
    }
    return this.otherPartyNameOrNull();
  }

  private payerOrNull() {
    return firstNonNull2(this.thirdPartyExpense, this.income)?.payer ?? null;
  }

  hasPayer() {
    return this.payerOrNull() != null;
  }

  payer() {
    if (!this.hasPayer()) {
      throw new Error(`Transaction ${this.id} has no payer`);
    }
    return this.payerOrNull();
  }

  private tripOrNull() {
    return (
      firstNonNull2(this.personalExpense, this.thirdPartyExpense)?.trip ?? null
    );
  }

  hasTrip() {
    return !!this.tripOrNull();
  }

  trip() {
    if (!this.hasTrip()) {
      throw new Error("Transaction has no trip");
    }
    return this.tripOrNull();
  }

  /**
   * @deprecated
   */
  amount() {
    return new AmountWithUnit({
      amountCents: this.amountCents,
      unit: this.unit(),
    });
  }

  amountWithUnit(): AmountWithUnit {
    return new AmountWithUnit({
      amountCents: this.amountCents,
      unit: this.unit(),
    });
  }

  amt(): Amount {
    return new Amount({
      amountCents: this.amountCents,
    });
  }

  amtOwnShare(): Amount {
    if (this.isTransfer()) {
      throw new Error("Transfer has no own share");
    }
    const ext = this.personalExpense ?? this.thirdPartyExpense ?? this.income;
    if (!ext) {
      throw new Error("no extension found");
    }
    return new Amount({
      amountCents: (
        this.personalExpense ??
        this.thirdPartyExpense ??
        this.income
      ).ownShareAmountCents,
    });
  }

  unit(): Unit {
    if (this.personalExpense) {
      return this.personalExpense.account.unit();
    }
    if (this.thirdPartyExpense) {
      return this.thirdPartyExpense.currency;
    }
    if (this.transfer) {
      return this.transfer.accountFrom.unit();
    }
    if (this.income) {
      return this.income.account.unit();
    }
    throw new Error(
      `No currency found for transaction: ${JSON.stringify(this, undefined, 2)}`
    );
  }

  /**
   * @deprecated
   */
  currency() {
    if (this.personalExpense) {
      return this.personalExpense.account.currency();
    }
    if (this.thirdPartyExpense) {
      return this.thirdPartyExpense.currency;
    }
    if (this.transfer) {
      return this.transfer.accountFrom.currency();
    }
    if (this.income) {
      return this.income.account.currency();
    }
    throw new Error(
      `No currency found for transaction: ${JSON.stringify(this, undefined, 2)}`
    );
  }

  amountAllParties(currency: Currency) {
    const unit = this.unit();
    if (unit instanceof Currency && unit.code() == currency.code()) {
      return new AmountWithCurrency({
        amountCents: this.amountCents,
        currency,
      });
    }
    if (unit instanceof Currency) {
      const amount = new AmountWithCurrency({
        amountCents: this.amountCents,
        currency,
      });
      return this.exchange.exchangeCurrency(amount, currency, this.timestamp);
    }
    if (unit instanceof Stock) {
      const a = this.exchange.exchangeStock(
        this.amt(),
        unit,
        currency,
        this.timestamp
      );
      return this.exchange.exchangeCurrency(a, currency, this.timestamp);
    }
    throw new Error(`Unknown unit: ${unit}`);
  }

  amountOwnShare(currency: Currency) {
    const unit = this.unit();
    const amt = this.amtOwnShare();

    if (unit instanceof Currency && unit.code() == currency.code()) {
      return new AmountWithCurrency({
        amountCents: amt.cents(),
        currency,
      });
    }
    if (unit instanceof Currency) {
      const amount = new AmountWithCurrency({
        amountCents: amt.cents(),
        currency: unit,
      });
      return this.exchange.exchangeCurrency(amount, currency, this.timestamp);
    }
    if (unit instanceof Stock) {
      const a = this.exchange.exchangeStock(
        amt,
        unit,
        currency,
        this.timestamp
      );
      return this.exchange.exchangeCurrency(a, currency, this.timestamp);
    }
    throw new Error(`Unknown unit: ${unit}`);
  }

  amountReceived(): AmountWithUnit {
    return new AmountWithUnit({
      amountCents: this.transfer.receivedAmountCents,
      unit: this.transfer.accountTo.unit(),
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
    if (transfer.accountFrom.id == ba.id) {
      return -this.amountCents;
    }
    return transfer.receivedAmountCents;
  }

  type(): TransactionType {
    if (this.isPersonalExpense()) {
      return TransactionType.PERSONAL;
    }
    if (this.isThirdPartyExpense()) {
      return TransactionType.EXTERNAL;
    }
    if (this.isIncome()) {
      return TransactionType.INCOME;
    }
    if (this.isTransfer()) {
      return TransactionType.TRANSFER;
    }
    throw new Error(
      `Unknown transaction type: ${JSON.stringify(this.dbValue)}`
    );
  }

  summary() {
    switch (this.type()) {
      case TransactionType.PERSONAL:
        return `${this.vendor()} ${
          this.hasOtherParty() ? "split with " + this.otherParty() : ""
        }`;
      case TransactionType.EXTERNAL:
        return `${this.vendor()} paid by ${this.payer()}`;
      case TransactionType.INCOME:
        return `${this.payer()} ${
          this.hasOtherParty() ? "split with " + this.otherParty() : ""
        }`;
      case TransactionType.TRANSFER:
        if (this.accountFrom().bank.id == this.accountTo().bank.id) {
          return `${this.accountFrom().bank.name} ${
            this.accountFrom().name
          } → ${this.accountTo().name}`;
        }
        return `${this.accountFrom().bank.name} ${this.accountFrom().name} → ${
          this.accountTo().bank.name
        } ${this.accountTo().name}`;
      default:
        throw new Error(`Unknown transaction type: ${this.type()}`);
    }
  }

  matchesType(tt: TransactionType) {
    return this.type() == tt;
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

function firstNonNull2<T1, T2>(a: T1, b: T2): T1 | T2 {
  return a ?? b;
}

function firstNonNull3<T1, T2, T3>(a: T1, b: T2, c: T3): T1 | T2 | T3 {
  return a ?? b ?? c;
}
