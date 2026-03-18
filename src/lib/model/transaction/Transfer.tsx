import {AmountWithUnit} from '@/lib/AmountWithUnit';
import {DBTransaction} from '@/lib/model/AllDatabaseDataModel';
import {
  Bank,
  BankAccount,
  accountBank,
  accountUnit,
} from '@/lib/model/BankAccount';
import {Stock} from '@/lib/model/Stock';
import {nanosToCents} from '@/lib/util/util';
import {LedgerAccountType, LedgerAccountV2} from '@prisma/client';

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

export function transferFromV2(
  tx: DBTransaction,
  accounts: Map<number, LedgerAccountV2>
): Transfer {
  if (!tx.categoryId) {
    throw new Error(`Transfer ${tx.id}: missing category`);
  }
  const assetLines = tx.lines.filter(l => {
    const acct = accounts.get(l.ledgerAccountId);
    return acct?.type === LedgerAccountType.ASSET;
  });
  if (assetLines.length < 2) {
    throw new Error(
      `Transfer ${tx.id}: expected at least 2 asset lines, got ${assetLines.length}`
    );
  }
  const outLine = assetLines.find(l => l.amountNanos < BigInt(0));
  const inLine = assetLines.find(l => l.amountNanos > BigInt(0));
  if (!outLine || !inLine) {
    throw new Error(
      `Transfer ${tx.id}: missing outgoing or incoming asset line`
    );
  }
  const fromAccount = accounts.get(outLine.ledgerAccountId);
  const toAccount = accounts.get(inLine.ledgerAccountId);
  if (!fromAccount?.bankAccountId || !toAccount?.bankAccountId) {
    throw new Error(`Transfer ${tx.id}: asset accounts missing bankAccountId`);
  }
  return {
    kind: 'Transfer',
    id: tx.id,
    timestampEpoch: new Date(tx.timestamp).getTime(),
    fromAccountId: fromAccount.bankAccountId,
    toAccountId: toAccount.bankAccountId,
    sentAmountCents: nanosToCents(-outLine.amountNanos),
    receivedAmountCents: nanosToCents(inLine.amountNanos),
    note: tx.note,
    categoryId: tx.categoryId,
    tagsIds: tx.tags.map(t => t.id),
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
