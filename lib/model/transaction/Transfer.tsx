import {TransactionType} from '@prisma/client';
import {AmountWithUnit} from '@/lib/AmountWithUnit';
import {assert, assertDefined} from '@/lib/assert';
import {TransactionWithTagIds} from '@/lib/model/AllDatabaseDataModel';
import {
  Bank,
  BankAccount,
  accountBank,
  accountUnit,
} from '@/lib/model/BankAccount';
import {Stock} from '@/lib/model/Stock';

export type Transfer = {
  kind: 'Transfer';
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

export function transferModelFromDB(init: TransactionWithTagIds): Transfer {
  assert(init.transactionType == TransactionType.TRANSFER);
  assertDefined(init.outgoingAccountId);
  assertDefined(init.incomingAccountId);
  assertDefined(init.outgoingAmountCents);
  assertDefined(init.incomingAmountCents);
  return {
    kind: 'Transfer',
    id: init.id,
    timestampEpoch: new Date(init.timestamp).getTime(),
    fromAccountId: init.outgoingAccountId,
    toAccountId: init.incomingAccountId,
    sentAmountCents: init.outgoingAmountCents,
    receivedAmountCents: init.incomingAmountCents,
    note: init.description,
    categoryId: init.categoryId,
    tagsIds: init.tags.map(t => t.id),
  };
}

export function outgoingBank(
  t: Transfer,
  banks: Bank[],
  bankAccounts: BankAccount[]
): Bank {
  const account = outgoingBankAccount(t, bankAccounts);
  return accountBank(account, banks);
}

export function incomingBank(
  t: Transfer,
  banks: Bank[],
  bankAccounts: BankAccount[]
): Bank {
  const account = incomingBankAccount(t, bankAccounts);
  return accountBank(account, banks);
}

export function outgoingBankAccount(
  t: Transfer,
  bankAccounts: BankAccount[]
): BankAccount {
  const account = bankAccounts.find(a => a.id == t.fromAccountId);
  if (!account) {
    throw new Error(
      `Cannot find account ${t.fromAccountId} for transaction ${t.id}`
    );
  }
  return account;
}

export function incomingBankAccount(
  t: Transfer,
  bankAccounts: BankAccount[]
): BankAccount {
  const account = bankAccounts.find(a => a.id == t.toAccountId);
  if (!account) {
    throw new Error(
      `Cannot find account ${t.toAccountId} for transaction ${t.id}`
    );
  }
  return account;
}

export function amountReceived(
  t: Transfer,
  bankAccounts: BankAccount[],
  stocks: Stock[]
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
  stocks: Stock[]
): AmountWithUnit {
  const outgoingAccount = outgoingBankAccount(t, bankAccounts);
  const unit = accountUnit(outgoingAccount, stocks);
  return new AmountWithUnit({
    amountCents: t.sentAmountCents,
    unit,
  });
}
