import {
  LedgerAccount,
  LedgerAccountType,
  Transaction as PbTransaction,
} from '@/lib/grpc/gen/prosper/v1/ledger';
import {timestampToEpoch} from '@/lib/grpc/timestamp';
import {TransactionCompanion} from '@/lib/model/transaction/TransactionCompanion';
import {nanosToCents} from '@/lib/util/util';

export type Income = {
  kind: 'Income';
  id: number;
  timestampEpoch: number;
  payer: string;
  amountCents: number;
  companions: TransactionCompanion[];
  note: string;
  accountId: number;
  categoryId: number;
  tagsIds: number[];
  tripId: number | null;
};

export function incomeFromDB(
  tx: PbTransaction,
  accounts: Map<number, LedgerAccount>
): Income {
  if (!tx.categoryId) {
    throw new Error(`Income ${tx.id}: missing category`);
  }
  // TODO: enforce setting payer on transaction create/edit and then switch check here to "!payer"
  if (tx.payer == null) {
    throw new Error(`Income ${tx.id}: missing payer`);
  }
  const assetLine = tx.lines.find(l => {
    const acct = accounts.get(l.ledgerAccountId);
    return acct?.type === LedgerAccountType.ASSET;
  });
  if (!assetLine) {
    throw new Error(`Income ${tx.id}: no asset line`);
  }
  const assetAccount = accounts.get(assetLine.ledgerAccountId);
  if (!assetAccount?.bankAccountId) {
    throw new Error(`Income ${tx.id}: asset account missing bankAccountId`);
  }
  const totalCents = nanosToCents(assetLine.amountNanos);
  const companions: TransactionCompanion[] = tx.splits.map(s => ({
    name: s.companionName,
    amountCents: nanosToCents(s.companionShareNanos),
  }));
  return {
    kind: 'Income',
    id: tx.id,
    timestampEpoch: timestampToEpoch(tx.timestamp),
    payer: tx.payer,
    amountCents: totalCents,
    companions,
    note: tx.note,
    accountId: assetAccount.bankAccountId,
    categoryId: tx.categoryId,
    tagsIds: tx.tagIds,
    tripId: tx.tripId ?? null,
  };
}
