import { AmountWithUnit } from "lib/AmountWithUnit";
import { BankAccount, accountUnit } from "lib/model/BankAccount";
import { Stock } from "../Stock";

export type Transfer = {
  kind: "Transfer";
  id: number;
  timestampEpoch: number;
  fromAccountId: number;
  toAccountId: number;
  sentAmountCents: number;
  receivedAmountCents: number;
  note: string;
  categoryId: number;
  tagsIds: number[];
};

export function outgoingBankAccount(
  t: Transfer,
  bankAccounts: BankAccount[],
): BankAccount {
  const account = bankAccounts.find((a) => a.id == t.fromAccountId);
  if (!account) {
    throw new Error(
      `Cannot find account ${t.fromAccountId} for transaction ${t.id}`,
    );
  }
  return account;
}
export function incomingBankAccount(
  t: Transfer,
  bankAccounts: BankAccount[],
): BankAccount {
  const account = bankAccounts.find((a) => a.id == t.toAccountId);
  if (!account) {
    throw new Error(
      `Cannot find account ${t.toAccountId} for transaction ${t.id}`,
    );
  }
  return account;
}
export function amountReceived(
  t: Transfer,
  bankAccounts: BankAccount[],
  stocks: Stock[],
): AmountWithUnit {
  const incomingAccount = incomingBankAccount(t, bankAccounts);
  const unit = accountUnit(incomingAccount, stocks);
  return new AmountWithUnit({
    amountCents: t.receivedAmountCents,
    unit,
  });
}
