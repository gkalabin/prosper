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
  if (account.id != 3) {
    return AmountWithUnit.zero(accountUnit(account, stocks));
  }
  let balanceCents = 0;
  for (const t of transactions) {
    switch (t.kind) {
      case 'NOOP':
        continue;
      case 'INITIAL_BALANCE':
        if (t.accountId == account.id) {
          balanceCents += t.balanceCents;
          console.log(t.kind, "INITIAL_BALANCE", balanceCents / 100, t.balanceCents);
        }
        continue;
      case 'TRANSFER':
        if (t.fromAccountId == account.id) {
          balanceCents -= t.sentAmountCents;
          console.log(t.kind, "TRANSFER F", balanceCents / 100);
        } else if (t.toAccountId == account.id) {
          balanceCents += t.receivedAmountCents;
          console.log(t.kind, "TRANSFER T", balanceCents / 100);
        }
        continue;
      case 'EXPENSE':
        if (t.accountId == account.id) {
          balanceCents -= t.amountCents;
          console.log(t.kind, "EXPENSE", balanceCents / 100);
        }
        continue;
      case 'INCOME':
        if (t.accountId == account.id) {
          balanceCents += t.amountCents;
          console.log(t.kind, "INCOME", balanceCents / 100);
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
  const a = new AmountWithUnit({
    amountCents: balanceCents,
    unit: accountUnit(account, stocks),
  });
  console.log(account.bankId, account.name, a.format());
  return a;
}
