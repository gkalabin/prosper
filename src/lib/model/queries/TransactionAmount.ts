import {AmountWithUnit} from '@/lib/AmountWithUnit';
import {Stock} from '@/lib/model/Stock';
import {add} from '../Amount';
import {Expense} from '../transactionNEW/Expense';
import {Income} from '../transactionNEW/Income';
import {unitFromId} from '../Unit';

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
