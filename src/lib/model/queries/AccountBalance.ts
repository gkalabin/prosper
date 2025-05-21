import {AmountWithUnit} from '@/lib/AmountWithUnit';
import {Account, accountUnit} from '@/lib/model/Account';
import {Stock} from '@/lib/model/Stock';
import {Transaction} from '@/lib/model/transactionNEW/Transaction';

export function findAccountBalance({
  account,
  transactions,
  stocks,
}: {
  account: Account;
  transactions: Transaction[];
  stocks: Stock[];
}): AmountWithUnit {
  let balanceCents = 0;
  for (const t of transactions) {
    switch (t.kind) {
      case 'NOOP':
        continue;
      case 'INITIAL_BALANCE':
        if (t.accountId == account.id) {
          balanceCents += t.balance.cents;
        }
        continue;
      case 'TRANSFER':
        if (t.fromAccountId == account.id) {
          balanceCents -= t.sentAmount.cents;
        } else if (t.toAccountId == account.id) {
          balanceCents += t.receivedAmount.cents;
        }
        continue;
      case 'EXPENSE':
      case 'INCOME':
        for (const u of t.balanceUpdates) {
          if (u.account.id == account.id) {
            balanceCents += u.delta.cents;
          }
        }
        continue;
      default:
        const _exhaustivenessCheck: never = t;
        throw new Error(
          'Unknown transaction: ' +
            JSON.stringify(_exhaustivenessCheck, null, 2)
        );
    }
  }
  return new AmountWithUnit({
    amountCents: balanceCents,
    unit: accountUnit(account, stocks),
  });
}
