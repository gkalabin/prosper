import {Account, accountUnit} from '@/lib/model/Account';
import {findTransactionAccount} from '@/lib/model/queries/TransactionAccount';
import {Stock} from '@/lib/model/Stock';
import {InitialBalance} from '@/lib/model/transactionNEW/InitialBalance';
import {Expense, Income} from '@/lib/model/transactionNEW/Transaction';
import {Unit} from '@/lib/model/Unit';

export function findTransactionUnit({
  t,
  accounts,
  stocks,
}: {
  t: Expense | Income | InitialBalance;
  accounts: Account[];
  stocks: Stock[];
}): Unit {
  switch (t.kind) {
    case 'EXPENSE':
    case 'INCOME':
    case 'INITIAL_BALANCE':
      const account = findTransactionAccount({t, accounts});
      return accountUnit(account, stocks);
    default:
      const _exhaustiveCheck: never = t;
      throw new Error(`No unit for ${_exhaustiveCheck}`);
  }
}
