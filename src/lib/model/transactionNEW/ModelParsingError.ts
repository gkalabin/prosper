import {TransactionNEWWithTagIds} from '@/lib/model/AllDatabaseDataModel';
import {AccountBalanceUpdate} from '@/lib/model/transactionNEW/AccountBalanceUpdate';
import {TransactionLineNEW as DBTransactionLine} from '@prisma/client';

export function modelError(
  dbTransaction: TransactionNEWWithTagIds,
  lines: DBTransactionLine[],
  updates: AccountBalanceUpdate[],
  message?: string
): never {
  throw new Error(
    `Cannot map transaction ${dbTransaction.id}: ${message ?? 'error'}
      Transaction:
        ${JSON.stringify(dbTransaction, null, 2)}
      
      Lines:
        ${JSON.stringify(lines, null, 2)}
      
      Parsed deltas:
        ${JSON.stringify(updates, null, 2)}`
  );
}
