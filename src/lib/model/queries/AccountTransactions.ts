import {Account} from '@/lib/model/Account';
import {Transaction} from '@/lib/model/transactionNEW/Transaction';

export function findAccountTransactions({
  account,
  transactions,
}: {
  account: Account;
  transactions: Transaction[];
}): Transaction[] {
  return transactions.filter(t => {
    switch (t.kind) {
      case 'NOOP':
        return t.accountIds.includes(account.id);
      case 'INITIAL_BALANCE':
        return t.accountId == account.id;
      case 'TRANSFER':
        return t.fromAccountId == account.id || t.toAccountId == account.id;
      case 'EXPENSE':
      case 'INCOME':
        return t.balanceUpdates.some(u => u.account.id == account.id);
      default:
        const _exhaustivenessCheck: never = t;
        throw new Error(
          'Unknown transaction: ' +
            JSON.stringify(_exhaustivenessCheck, null, 2)
        );
    }
  });
}
