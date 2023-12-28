import { Bank as DBBank, BankAccount as DBBankAccount } from "@prisma/client";
import { Currency } from "./Currency";
import { Transaction, transactionAbsoluteAmount } from "./Transaction";

export type Bank = {
  id: number;
  name: string;
  displayOrder: number;
  accounts: BankAccount[];
  dbValue: DBBank;
};

export type BankAccount = {
  id: number;
  name: string;
  initialBalanceCents: number;
  currency: Currency;
  displayOrder: number;
  bank: Bank;
  transactions: Transaction[];
  dbValue: DBBankAccount;
};

export const bankAccountBalance = (ba: BankAccount): number => {
  let balance = ba.initialBalanceCents;
  ba.transactions.forEach(t => {
    const amount = transactionAbsoluteAmount(t, ba);
    balance += amount;
  })
  return balance;
};
