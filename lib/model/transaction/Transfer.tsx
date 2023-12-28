import { AmountWithUnit } from "lib/AmountWithUnit";
import { assertDefined } from "lib/assert";
import { TransactionWithExtensionsAndTagIds } from "lib/model/AllDatabaseDataModel";
import { BankAccount, accountUnit } from "lib/model/BankAccount";
import { Stock } from "lib/model/Stock";

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

export function transferModelFromDB(
  init: TransactionWithExtensionsAndTagIds,
): Transfer {
  assertDefined(init.transfer);
  return {
    kind: "Transfer",
    id: init.id,
    timestampEpoch: new Date(init.timestamp).getTime(),
    fromAccountId: init.transfer.accountFromId,
    toAccountId: init.transfer.accountToId,
    sentAmountCents: init.amountCents,
    receivedAmountCents: init.transfer.receivedAmountCents,
    note: init.description,
    categoryId: init.categoryId,
    tagsIds: init.tags.map((t) => t.id),
  };
}

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

export function amountSent(
  t: Transfer,
  bankAccounts: BankAccount[],
  stocks: Stock[],
): AmountWithUnit {
  const outgoingAccount = outgoingBankAccount(t, bankAccounts);
  const unit = accountUnit(outgoingAccount, stocks);
  return new AmountWithUnit({
    amountCents: t.sentAmountCents,
    unit,
  });
}
