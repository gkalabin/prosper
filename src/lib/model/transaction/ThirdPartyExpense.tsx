import {assert} from '@/lib/assert';
import {DBTransaction} from '@/lib/model/AllDatabaseDataModel';
import {TransactionCompanion} from '@/lib/model/transaction/TransactionCompanion';
import {nanosToCents} from '@/lib/util/util';
import {LedgerAccountType, LedgerAccountV2} from '@prisma/client';

export type ThirdPartyExpense = {
  kind: 'ThirdPartyExpense';
  id: number;
  timestampEpoch: number;
  payer: string;
  vendor: string;
  amountCents: number;
  currencyCode: string;
  ownShareCents: number;
  companions: TransactionCompanion[];
  note: string;
  categoryId: number;
  tagsIds: number[];
  tripId: number | null;
};

export function thirdPartyExpenseFromV2(
  tx: DBTransaction,
  accounts: Map<number, LedgerAccountV2>
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
  const ownShareCents = nanosToCents(expenseLine.amountNanos);
  const currencyCode = expenseLine.currencyCode;
  if (!currencyCode) {
    throw new Error(`ThirdPartyExpense ${tx.id}: missing currencyCode`);
  }
  // Sum how much others paid as third party expense is paid by others (usually single party).
  const totalNanos = tx.splits
    // BigInt() wrapper is needed because Next.js cache serializes bigint as number.
    .map(s => BigInt(s.companionPaidNanos))
    .reduce((i, j) => i + j, BigInt(0));
  const companions: TransactionCompanion[] = tx.splits.map(s => ({
    name: s.companionName,
    amountCents: nanosToCents(s.companionShareNanos),
  }));
  if (!tx.payer) {
    throw new Error(`ThirdPartyExpense ${tx.id}: missing payer`);
  }
  if (!tx.vendor) {
    throw new Error(`ThirdPartyExpense ${tx.id}: missing vendor`);
  }
  return {
    kind: 'ThirdPartyExpense',
    id: tx.id,
    timestampEpoch: new Date(tx.timestamp).getTime(),
    payer: tx.payer,
    vendor: tx.vendor,
    amountCents: nanosToCents(totalNanos),
    currencyCode,
    ownShareCents,
    companions,
    note: tx.note,
    categoryId: tx.categoryId!,
    tagsIds: tx.tags.map(t => t.id),
    tripId: tx.tripId,
  };
}
