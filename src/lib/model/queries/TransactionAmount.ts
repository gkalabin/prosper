import {AmountWithUnit} from '@/lib/AmountWithUnit';
import {Account} from '@/lib/model/Account';
import {findTransactionUnit} from '@/lib/model/queries/TransactionUnit';
import {Stock} from '@/lib/model/Stock';
import {InitialBalance} from '@/lib/model/transactionNEW/InitialBalance';
import {Expense, Income} from '@/lib/model/transactionNEW/Transaction';

export function findAllPartiesAmount({
  t,
  accounts,
  stocks,
}: {
  t: Expense | Income | InitialBalance;
  accounts: Account[];
  stocks: Stock[];
}): AmountWithUnit {
  const unit = findTransactionUnit({t, accounts, stocks});
  if (t.kind == 'INITIAL_BALANCE') {
    return new AmountWithUnit({
      amountCents: t.balanceCents,
      unit,
    });
  }
  return new AmountWithUnit({
    amountCents: t.amountCents,
    unit,
  });
}

export function findOwnShareAmount({
  t,
  accounts,
  stocks,
}: {
  t: Expense | Income | InitialBalance;
  accounts: Account[];
  stocks: Stock[];
}): AmountWithUnit {
  const unit = findTransactionUnit({t, accounts, stocks});
  if (t.kind == 'INITIAL_BALANCE') {
    return new AmountWithUnit({
      amountCents: t.balanceCents,
      unit,
    });
  }
  return new AmountWithUnit({
    amountCents: ownShareAmountCentsIgnoreRefunds(t),
    unit,
  });
}

function ownShareAmountCentsIgnoreRefunds(t: Expense | Income): number {
  const otherPartiesAmountCents = t.companions
    .map(c => c.amountCents)
    .reduce((a, b) => a + b, 0);
  return t.amountCents - otherPartiesAmountCents;
}
