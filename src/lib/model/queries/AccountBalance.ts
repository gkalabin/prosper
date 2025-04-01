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
          balanceCents += t.balanceCents;
        }
        continue;
      case 'TRANSFER':
        if (t.fromAccountId == account.id) {
          balanceCents -= t.sentAmountCents;
        } else if (t.toAccountId == account.id) {
          balanceCents += t.receivedAmountCents;
        }
        continue;
      case 'EXPENSE':
        if (t.accountId == account.id) {
          balanceCents -= t.actuallyPaidFromOwnAccount.cents;
        }
        continue;
      case 'INCOME':
        if (t.accountId == account.id) {
          balanceCents += t.actuallyReceivedOnOwnAccount.cents;
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
