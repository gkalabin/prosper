import {uniqMostFrequent} from '@/lib/collections';
import {TransactionNEWWithTagIds} from '@/lib/model/AllDatabaseDataModel';
import {counterpartyAndCategoryFromLines} from '@/lib/model/transactionNEW/LinesParsing';
import {TransactionLineNEW as DBTransactionLine} from '@prisma/client';

export type Noop = {
  kind: 'NOOP';
  transactionId: number;
  timestampEpoch: number;
  counterparty: string;
  note: string;
  tagsIds: number[];
  tripId: number | null;
  accountIds: number[];
};

export function newNoopTransaction({
  dbTransaction,
  lines,
}: {
  dbTransaction: TransactionNEWWithTagIds;
  lines: DBTransactionLine[];
}): Noop {
  const {counterparty} = counterpartyAndCategoryFromLines({
    dbTransaction,
    unsortedLines: lines,
    allLines: lines,
    updates: [],
  });
  const accountIds = uniqMostFrequent(lines.map(l => l.accountId));
  return {
    kind: 'NOOP',
    transactionId: dbTransaction.id,
    timestampEpoch: new Date(dbTransaction.timestamp).getTime(),
    counterparty,
    note: dbTransaction.description,
    tagsIds: dbTransaction.tags.map(t => t.id),
    tripId: dbTransaction.tripId,
    accountIds,
  };
}
