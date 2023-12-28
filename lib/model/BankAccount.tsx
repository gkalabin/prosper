import { Bank as DBBank, BankAccount as DBBankAccount } from "@prisma/client";
import { Currencies, Currency, ExchangeRates } from "lib/ClientSideModel";
import { Transaction } from "lib/model/Transaction";

export const bankAccountsFlatList = (banks: Bank[]): BankAccount[] => {
  return banks.flatMap((b) => b.accounts);
};

export class Bank {
  readonly id: number;
  readonly name: string;
  readonly displayOrder: number;
  readonly accounts: BankAccount[];
  readonly dbValue: DBBank;
  private readonly exchangeRates?: ExchangeRates;

  public constructor(init: DBBank, er?: ExchangeRates) {
    this.dbValue = init;
    this.id = init.id;
    this.name = init.name;
    this.displayOrder = init.displayOrder;
    this.accounts = [];
    this.exchangeRates = er;
  }

  balance(currency: Currency) {
    if (!this.exchangeRates) {
      throw new Error("No exchange rates set");
    }
    let balance = 0;
    this.accounts.forEach((x) => {
      balance += this.exchangeRates.exchange(
        x.currency,
        currency,
        new Date(),
        x.balance()
      );
    });
    return balance;
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

  balance() {
    let balance = this.initialBalanceCents;
    this.transactions.forEach((t) => {
      const amount = t.amountSignedCents(this);
      balance += amount;
    });
    return balance;
  }
}
