import { Category } from "./Category";
import { Income } from "./Income";
import { PersonalExpense } from "./PersonalExpense";
import { ThirdPartyExpense } from "./ThirdPartyExpense";
import { Transfer } from "./Transfer";
import { BankAccount } from "./BankAccount";
// import { assert } from "console";

export type Transaction = {
  id: number;
  timestamp: Date;
  description: string;
  amountCents: number;
  category: Category;

  personalExpense?: PersonalExpense;
  thirdPartyExpense?: ThirdPartyExpense;
  income?: Income;
  transfer?: Transfer;
};

export const transactionAbsoluteAmount = (
  t: Transaction,
  ba: BankAccount
): number => {
  if (!transactionBelongsToAccount(t, ba)) {
    console.warn(`Transaction doesn't belong to the account`, t, ba);
    return 0;
  }
  if (t.personalExpense) {
    return -t.amountCents;
  }
  if (t.income) {
    return t.amountCents;
  }
  const transfer = t.transfer
  // assert(transfer)
  if (transfer.accountFrom.id == ba.id) {
    return -t.amountCents;
  }
  // assert(transfer.accountTo.id == ba.id)
  return transfer.receivedAmountCents;
};

export const transactionSign = (t: Transaction): number => {
  if (t.personalExpense || t.thirdPartyExpense) {
    return -1;
  }
  if (t.income) {
    return 1;
  }
  return 0;
};

export const transactionBelongsToAccount = (
  t: Transaction,
  ba: BankAccount
): boolean => {
  if (t.income && t.income.account.id == ba.id) {
    return true;
  }
  if (t.personalExpense && t.personalExpense.account.id == ba.id) {
    return true;
  }
  if (
    t.transfer &&
    (t.transfer.accountFrom.id == ba.id || t.transfer.accountTo.id == ba.id)
  ) {
    return true;
  }
  return false;
};
