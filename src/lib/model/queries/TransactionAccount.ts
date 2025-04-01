import {Account} from '@/lib/model/Account';
import {InitialBalance} from '@/lib/model/transactionNEW/InitialBalance';
import {Expense, Income} from '@/lib/model/transactionNEW/Transaction';

export function findTransactionAccount({
  t,
  accounts,
}: {
  t: Expense | Income | InitialBalance;
  accounts: Account[];
}): Account {
  const account = accounts.find(a => a.id == t.accountId);
  if (!account) {
    throw new Error(
      `Cannot find account ${t.accountId} for transaction ${t.transactionId}`
    );
  }
  return account;
}
