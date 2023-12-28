import { Currency } from "lib/model/Currency";
import { Transaction } from "lib/model/Transaction";

export type Bank = {
  id: number;
  name: string;
  displayOrder: number;
  accounts: BankAccount[];
};

export type BankAccount = {
  id: number;
  name: string;
  initialBalanceCents: number;
  currency: Currency;
  displayOrder: number;
  bank: Bank;
  transactions: Transaction[];
};

export const bankAccountBalance = (ba: BankAccount): number => {
  let balance = ba.initialBalanceCents;
  ba.transactions.forEach((t) => {
    const amount = t.amountSignedCents(ba);
    balance += amount;
  });
  return balance;
};

export const bankAccountsFlatList = (banks: Bank[]): BankAccount[] => {
  return banks.flatMap((b) => b.accounts);
};
