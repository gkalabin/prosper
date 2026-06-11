import {
  LedgerAccount,
  LedgerAccountType,
  Transaction as PbTransaction,
} from '@/lib/grpc/gen/prosper/v1/ledger';
import {timestampToEpoch} from '@/lib/grpc/timestamp';
import {TransactionCompanion} from '@/lib/model/transaction/TransactionCompanion';

export type PersonalExpense = {
  kind: 'PersonalExpense';
  id: number;
  timestampEpoch: number;
  vendor: string;
  amountNanos: bigint;
  companions: TransactionCompanion[];
  note: string;
  accountId: number;
  categoryId: number;
  tagsIds: number[];
  tripId: number | null;
  refundGroupTransactionIds: number[];
};

export function personalExpenseFromDB(
  tx: PbTransaction,
  accounts: Map<number, LedgerAccount>
): PersonalExpense {
  if (!tx.categoryId) {
    throw new Error(`Expense ${tx.id}: no category`);
  }
  // TODO: enforce setting vendor on transaction create/edit and then switch check here to "!vendor"
  if (tx.vendor == null) {
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

  const totalNanos = -assetLine.amountNanos;
  const companions: TransactionCompanion[] = tx.splits.map(s => ({
    name: s.companionName,
    amountNanos: s.companionShareNanos,
  }));
  return {
    kind: 'PersonalExpense',
    id: tx.id,
    timestampEpoch: timestampToEpoch(tx.timestamp),
    vendor: tx.vendor,
    amountNanos: totalNanos,
    companions,
    note: tx.note,
    accountId: assetAccount.bankAccountId,
    categoryId: tx.categoryId,
    tagsIds: tx.tagIds,
    tripId: tx.tripId ?? null,
    // TODO: fill for expenses.
    refundGroupTransactionIds: [],
  };
}
