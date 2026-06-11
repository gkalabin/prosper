import {assert} from '@/lib/assert';
import {
  LedgerAccount,
  LedgerAccountType,
  Transaction as PbTransaction,
} from '@/lib/grpc/gen/prosper/v1/ledger';
import {timestampToEpoch} from '@/lib/grpc/timestamp';
import {TransactionCompanion} from '@/lib/model/transaction/TransactionCompanion';

export type ThirdPartyExpense = {
  kind: 'ThirdPartyExpense';
  id: number;
  timestampEpoch: number;
  payer: string;
  vendor: string;
  amountNanos: bigint;
  currencyCode: string;
  ownShareNanos: bigint;
  companions: TransactionCompanion[];
  note: string;
  categoryId: number;
  tagsIds: number[];
  tripId: number | null;
};

export function thirdPartyExpenseFromDB(
  tx: PbTransaction,
  accounts: Map<number, LedgerAccount>
): ThirdPartyExpense {
  assert(
    tx.splits.length > 0,
    `Third party expense ${tx.id} has no split context`
  );
  const expenseLine = tx.lines.find(l => {
    const acct = accounts.get(l.ledgerAccountId);
    return acct?.type === LedgerAccountType.EXPENSE;
  });
  if (!expenseLine) {
    throw new Error(`ThirdPartyExpense ${tx.id}: no expense line`);
  }
  const receivableLine = tx.lines.find(l => {
    const acct = accounts.get(l.ledgerAccountId);
    return acct?.type === LedgerAccountType.RECEIVABLE;
  });
  if (!receivableLine) {
    throw new Error(`ThirdPartyExpense ${tx.id}: no receivable line`);
  }
  const ownShareNanos = expenseLine.amountNanos;
  const currencyCode = expenseLine.currencyCode;
  if (!currencyCode) {
    throw new Error(`ThirdPartyExpense ${tx.id}: missing currencyCode`);
  }
  // Sum how much others paid as third party expense is paid by others (usually single party).
  const totalNanos = tx.splits
    .map(s => s.companionPaidNanos)
    .reduce((i, j) => i + j, BigInt(0));
  const companions: TransactionCompanion[] = tx.splits.map(s => ({
    name: s.companionName,
    amountNanos: s.companionShareNanos,
  }));
  if (!tx.payer) {
    throw new Error(`ThirdPartyExpense ${tx.id}: missing payer`);
  }
  if (!tx.vendor) {
    throw new Error(`ThirdPartyExpense ${tx.id}: missing vendor`);
  }
  if (!tx.categoryId) {
    throw new Error(`ThirdPartyExpense ${tx.id}: missing category`);
  }
  return {
    kind: 'ThirdPartyExpense',
    id: tx.id,
    timestampEpoch: timestampToEpoch(tx.timestamp),
    payer: tx.payer,
    vendor: tx.vendor,
    amountNanos: totalNanos,
    currencyCode,
    ownShareNanos,
    companions,
    note: tx.note,
    categoryId: tx.categoryId,
    tagsIds: tx.tagIds,
    tripId: tx.tripId ?? null,
  };
}
