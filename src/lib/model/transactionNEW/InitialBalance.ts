import {TransactionNEWWithTagIds} from '@/lib/model/AllDatabaseDataModel';
import {AccountBalanceUpdate} from '@/lib/model/transactionNEW/AccountBalanceUpdate';

export type InitialBalance = {
  kind: 'INITIAL_BALANCE';
  transactionId: number;
  timestampEpoch: number;
  balanceCents: number;
  accountId: number;
};

export function newInitialBalance({
  dbTransaction,
  debit,
}: {
  dbTransaction: TransactionNEWWithTagIds;
  debit: AccountBalanceUpdate;
}): InitialBalance {
  console.log({
    kind: 'INITIAL_BALANCE',
    transactionId: dbTransaction.id,
    timestampEpoch: new Date(dbTransaction.timestamp).getTime(),
    balanceCents: debit.delta,
    accountId: debit.account.id,
  });
  return {
    kind: 'INITIAL_BALANCE',
    transactionId: dbTransaction.id,
    timestampEpoch: new Date(dbTransaction.timestamp).getTime(),
    balanceCents: debit.delta,
    accountId: debit.account.id,
  };
}
