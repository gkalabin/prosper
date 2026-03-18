import {DBTransaction} from '@/lib/model/AllDatabaseDataModel';
import {TransactionCompanion} from '@/lib/model/transaction/TransactionCompanion';
import {nanosToCents} from '@/lib/util/util';
import {LedgerAccountType, LedgerAccountV2} from '@prisma/client';

export type PersonalExpense = {
  kind: 'PersonalExpense';
  id: number;
  timestampEpoch: number;
  vendor: string;
  amountCents: number;
  companions: TransactionCompanion[];
  note: string;
  accountId: number;
  categoryId: number;
  tagsIds: number[];
  tripId: number | null;
  refundGroupTransactionIds: number[];
};

export function personalExpenseFromV2(
  tx: DBTransaction,
  accounts: Map<number, LedgerAccountV2>
): PersonalExpense {
  if (!tx.categoryId) {
    throw new Error(`Expense ${tx.id}: no category`);
  }
  // TODO: enforce setting vendor on transaction create/edit and then switch check here to "!vendor"
  if (tx.vendor === null) {
    throw new Error(`Expense ${tx.id}: no vendor`);
  }
  // TODO: verify exactly 1 asset line and 1 expense line
  const assetLine = tx.lines.find(l => {
    const acct = accounts.get(l.ledgerAccountId);
    return acct?.type === LedgerAccountType.ASSET;
  });
  if (!assetLine) {
    throw new Error(`Expense ${tx.id}: no asset line`);
  }
  const assetAccount = accounts.get(assetLine.ledgerAccountId);
  if (!assetAccount?.bankAccountId) {
    throw new Error(`Expense ${tx.id}: cannot find bankAccount`);
  }

  const totalCents = nanosToCents(-assetLine.amountNanos);
  const companions: TransactionCompanion[] = tx.splits.map(s => ({
    name: s.companionName,
    amountCents: nanosToCents(s.companionShareNanos),
  }));
  return {
    kind: 'PersonalExpense',
    id: tx.id,
    timestampEpoch: new Date(tx.timestamp).getTime(),
    vendor: tx.vendor,
    amountCents: totalCents,
    companions,
    note: tx.note,
    accountId: assetAccount.bankAccountId,
    categoryId: tx.categoryId,
    tagsIds: tx.tags.map(t => t.id),
    tripId: tx.tripId,
    // TODO: fill for expenses.
    refundGroupTransactionIds: [],
  };
}
