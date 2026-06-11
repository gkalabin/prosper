import {AmountWithUnit} from '@/lib/AmountWithUnit';
import {
  LedgerAccount,
  LedgerAccountType,
  Transaction as PbTransaction,
} from '@/lib/grpc/gen/prosper/v1/ledger';
import {timestampToEpoch} from '@/lib/grpc/timestamp';
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
  sentAmountNanos: bigint;
  receivedAmountNanos: bigint;
  note: string;
  categoryId: number;
  tagsIds: number[];
};

export function transferFromDB(
  tx: PbTransaction,
  accounts: Map<number, LedgerAccount>
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
    timestampEpoch: timestampToEpoch(tx.timestamp),
    fromAccountId: fromAccount.bankAccountId,
    toAccountId: toAccount.bankAccountId,
    sentAmountNanos: -outLine.amountNanos,
    receivedAmountNanos: inLine.amountNanos,
    note: tx.note,
    categoryId: tx.categoryId,
    tagsIds: tx.tagIds,
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
    amountNanos: t.receivedAmountNanos,
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
    amountNanos: t.sentAmountNanos,
    unit,
  });
}
