import {Charts} from '@/components/charts';
import {AmountWithCurrency} from '@/lib/AmountWithCurrency';
import {ExchangedIntervalTransactions} from '@/lib/ExchangedTransactions';
import {Granularity} from '@/lib/util/Granularity';
import {MoneyTimeseries} from '@/lib/util/Timeseries';
import {eachYearOfInterval} from 'date-fns';

export function YearlyCashflowCumulative({
  input,
}: {
  input: ExchangedIntervalTransactions;
}) {
  const cashflow = new MoneyTimeseries(input.currency(), Granularity.YEARLY);
  for (const {t, ownShare} of input.income()) {
    cashflow.increment(t.timestampEpoch, ownShare);
  }
  for (const {t, ownShare} of input.expenses()) {
    cashflow.increment(t.timestampEpoch, ownShare.negate());
  }
  const cumulative = new MoneyTimeseries(input.currency(), Granularity.YEARLY);
  let current = AmountWithCurrency.zero(input.currency());
  for (const m of eachYearOfInterval(input.interval())) {
    current = current.add(cashflow.get(m));
    cumulative.set(m, current);
  }
  return (
    <Charts.Line
      title={'Cumulative yearly cashflow'}
      granularity={Granularity.YEARLY}
      currency={input.currency()}
      interval={input.interval()}
      data={cumulative}
    />
  );
}
