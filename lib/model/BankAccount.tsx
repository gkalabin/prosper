import { Bank as DBBank, BankAccount as DBBankAccount } from "@prisma/client";
import {
  StockAndCurrencyExchange,
} from "lib/ClientSideModel";
import { AmountWithCurrency } from "lib/AmountWithCurrency";
import {
  Currencies,
  Currency
} from "lib/model/Currency";
import { Transaction } from "lib/model/Transaction";

export class Bank {
  readonly id: number;
  readonly name: string;
  readonly displayOrder: number;
  readonly accounts: BankAccount[];
  readonly dbValue: DBBank;
  private readonly exchange?: StockAndCurrencyExchange;

  public constructor(init: DBBank, exchange?: StockAndCurrencyExchange) {
    this.dbValue = init;
    this.id = init.id;
    this.name = init.name;
    this.displayOrder = init.displayOrder;
    this.accounts = [];
    this.exchange = exchange;
  }

  balance(targetCurrency: Currency): AmountWithCurrency {
    if (!this.exchange) {
      throw new Error("No exchange rates set");
    }
    let bankBalance = new AmountWithCurrency({
      amountCents: 0,
      currency: targetCurrency,
    });
    const now = new Date();
    this.accounts.forEach((x) => {
      const delta = this.exchange.exchange(x.balance(), targetCurrency, now);
      bankBalance = bankBalance.add(delta);
    });
    return bankBalance;
  }
}

export class BankAccount {
  readonly id: number;
  readonly name: string;
  readonly initialBalanceCents: number;
  readonly currency: Currency;
  readonly displayOrder: number;
  readonly bank: Bank;
  readonly transactions: Transaction[];

  readonly dbValue: DBBankAccount;

  public constructor(
    init: DBBankAccount,
    bankById: { [id: number]: Bank },
    currencies: Currencies
  ) {
    this.dbValue = init;
    this.id = init.id;
    this.name = init.name;
    this.initialBalanceCents = init.initialBalanceCents;
    this.currency = currencies.findById(init.currencyId);
    this.displayOrder = init.displayOrder;
    this.bank = bankById[init.bankId];
    this.transactions = [];
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

  balance(): AmountWithCurrency {
    let balance = this.initialBalanceCents;
    this.transactions.forEach((t) => {
      const amount = t.amountSignedCents(this);
      balance += amount;
    });
    return new AmountWithCurrency({
      amountCents: balance,
      currency: this.currency,
    });
  }
}
