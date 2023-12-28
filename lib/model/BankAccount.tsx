import { Bank as DBBank, BankAccount as DBBankAccount } from "@prisma/client";
import { AmountWithUnit } from "lib/AmountWithUnit";
import { Currency } from "lib/model/Currency";
import { Stock } from "lib/model/Stock";
import { Transaction } from "lib/model/Transaction";
import { Unit } from "lib/model/Unit";

export class Bank {
  readonly id: number;
  readonly name: string;
  readonly displayOrder: number;
  readonly accounts: BankAccount[];

  public constructor(init: DBBank) {
    this.id = init.id;
    this.name = init.name;
    this.displayOrder = init.displayOrder;
    this.accounts = [];
  }
}

export class BankAccount {
  readonly id: number;
  readonly name: string;
  readonly initialBalanceCents: number;
  readonly _currency?: Currency;
  readonly _stock?: Stock;
  readonly displayOrder: number;
  readonly bank: Bank;
  readonly transactions: Transaction[];

  readonly dbValue: DBBankAccount;

  public constructor(
    init: DBBankAccount,
    bankById: { [id: number]: Bank },
    stocks: Stock[]
  ) {
    this.dbValue = init;
    this.id = init.id;
    this.name = init.name;
    this.initialBalanceCents = init.initialBalanceCents;
    this._currency =
      init.currencyCode && Currency.findByCode(init.currencyCode);
    this._stock = init.stockId && stocks.find((s) => s.id() == init.stockId);
    this.displayOrder = init.displayOrder;
    this.bank = bankById[init.bankId];
    this.transactions = [];
  }

  hasStock(): boolean {
    return !!this._stock;
  }

  stock(): Stock {
    if (!this._stock) {
      throw new Error(`BankAccount ${this.name} does not have a stock`);
    }
    return this._stock;
  }

  hasCurrency(): boolean {
    return !!this._currency;
  }

  currency(): Currency {
    if (!this._currency) {
      throw new Error(`BankAccount ${this.name} does not have a currency`);
    }
    return this._currency;
  }

  isArchived() {
    return this.dbValue.archived;
  }

  isJoint() {
    return this.dbValue.joint;
  }

  isLiquid() {
    return this.dbValue.liquid;
  }

  unit(): Unit {
    if (this.hasStock()) {
      return this.stock();
    }
    if (this.hasCurrency()) {
      return this.currency();
    }
    throw new Error(`BankAccount ${this.id} has no unit`);
  }

  balance(): AmountWithUnit {
    let balance = this.initialBalanceCents;
    this.transactions.forEach((t) => {
      const amount = t.amountSignedCents(this);
      balance += amount;
    });
    return new AmountWithUnit({
      amountCents: balance,
      unit: this.unit(),
    });
  }
}
