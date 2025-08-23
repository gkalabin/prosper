import {AmountWithUnit} from '@/lib/AmountWithUnit';
import {Stock} from '@/lib/model/Stock';
import {Account, accountUnit, mustFindAccount} from '../Account';
import {add} from '../Amount';
import {Expense} from '../transactionNEW/Expense';
import {Income} from '../transactionNEW/Income';
import {InitialBalance} from '../transactionNEW/InitialBalance';
import {unitFromId} from '../Unit';
import {Transfer} from './../transactionNEW/Transfer';

export function findAllPartiesAmount({
  t,
  stocks,
}: {
  t: Expense | Income;
  stocks: Stock[];
}): AmountWithUnit {
  const c = t.categorisation;
  const amount = c.companion
    ? add(c.userShare, c.companion?.share)
    : c.userShare;
  const unit = unitFromId(c.unitId, stocks);
  return new AmountWithUnit({
    amountCents: amount.cents,
    unit,
  });
}

export function findOwnShareAmount({
  t,
  stocks,
}: {
  t: Expense | Income;
  stocks: Stock[];
}): AmountWithUnit {
  const c = t.categorisation;
  const unit = unitFromId(c.unitId, stocks);
  return new AmountWithUnit({
    amountCents: c.userShare.cents,
    unit,
  });
}

export function findSentAmount({
  t,
  accounts,
  stocks,
}: {
  t: Transfer;
  accounts: Account[];
  stocks: Stock[];
}): AmountWithUnit {
  const from = mustFindAccount(t.fromAccountId, accounts);
  return new AmountWithUnit({
    amountCents: t.sentAmount.cents,
    unit: accountUnit(from, stocks),
  });
}

export function findReceivedAmount({
  t,
  accounts,
  stocks,
}: {
  t: Transfer;
  accounts: Account[];
  stocks: Stock[];
}): AmountWithUnit {
  const from = mustFindAccount(t.fromAccountId, accounts);
  return new AmountWithUnit({
    amountCents: t.sentAmount.cents,
    unit: accountUnit(from, stocks),
  });
}

export function findInitialBalanceAmount({
  t,
  accounts,
  stocks,
}: {
  t: InitialBalance;
  accounts: Account[];
  stocks: Stock[];
}): AmountWithUnit {
  const from = mustFindAccount(t.accountId, accounts);
  return new AmountWithUnit({
    amountCents: t.balance.cents,
    unit: accountUnit(from, stocks),
  });
}
