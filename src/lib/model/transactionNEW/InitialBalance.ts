import {AccountType} from '@/lib/model/Account';
import {TransactionNEWWithTagIds} from '@/lib/model/AllDatabaseDataModel';
import {AccountBalanceUpdate} from '@/lib/model/transactionNEW/AccountBalanceUpdate';
import {modelError} from '@/lib/model/transactionNEW/ModelParsingError';
import {TransactionLineNEW as DBTransactionLine} from '@prisma/client';

export type InitialBalance = {
  kind: 'INITIAL_BALANCE';
  transactionId: number;
  timestampEpoch: number;
  balanceCents: number;
  accountId: number;
};

export function newInitialBalance({
  dbTransaction,
  lines,
  debit,
  credit,
}: {
  dbTransaction: TransactionNEWWithTagIds;
  lines: DBTransactionLine[];
  debit: AccountBalanceUpdate;
  credit: AccountBalanceUpdate;
}): InitialBalance {
  let accountUpdate: AccountBalanceUpdate | null = null;
  if (debit.account.type == AccountType.ASSET) {
    accountUpdate = debit;
  } else if (credit.account.type == AccountType.ASSET) {
    accountUpdate = credit;
  } else {
    return modelError(dbTransaction, lines, [debit, credit]);
  }
  return {
    kind: 'INITIAL_BALANCE',
    transactionId: dbTransaction.id,
    timestampEpoch: new Date(dbTransaction.timestamp).getTime(),
    // Lack of abs here is intentional as the initial balance can be either positive or negative
    // and there is only single balanceCents field.
    balanceCents: accountUpdate.delta,
    accountId: accountUpdate.account.id,
  };
}
