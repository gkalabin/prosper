import {TransactionNEWWithTagIds} from '@/lib/model/AllDatabaseDataModel';
import {AccountBalanceUpdate} from '@/lib/model/transactionNEW/AccountBalanceUpdate';
import {categoryIdFromLines} from '@/lib/model/transactionNEW/LinesParsing';
import {TransactionLineNEW as DBTransactionLine} from '@prisma/client';
import {abs, AmountPlain} from '../Amount';

export type Transfer = {
  kind: 'TRANSFER';
  transactionId: number;
  timestampEpoch: number;
  fromAccountId: number;
  toAccountId: number;
  sentAmount: AmountPlain;
  receivedAmount: AmountPlain;
  note: string;
  categoryId: number;
  tagsIds: number[];
  tripId: number | null;
};

export function newTransfer({
  dbTransaction,
  lines,
  debit,
  credit,
}: {
  dbTransaction: TransactionNEWWithTagIds;
  lines: DBTransactionLine[];
  debit: AccountBalanceUpdate;
  credit: AccountBalanceUpdate;
}): Transfer {
  const categoryId = categoryIdFromLines({
    dbTransaction,
    unsortedLines: lines,
    allLines: lines,
    updates: [debit, credit],
  });
  return {
    kind: 'TRANSFER',
    transactionId: dbTransaction.id,
    timestampEpoch: new Date(dbTransaction.timestamp).getTime(),
    fromAccountId: credit.account.id,
    toAccountId: debit.account.id,
    sentAmount: abs(credit.delta),
    receivedAmount: abs(debit.delta),
    note: dbTransaction.description,
    categoryId,
    tagsIds: dbTransaction.tags.map(t => t.id),
    tripId: dbTransaction.tripId,
  };
}
