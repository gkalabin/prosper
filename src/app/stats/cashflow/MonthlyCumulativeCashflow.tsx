'use client';
import Charts from '@/components/charts/interface';
import {AmountWithCurrency} from '@/lib/AmountWithCurrency';
import {ExchangedIntervalTransactions} from '@/lib/ExchangedTransactions';
import {Granularity} from '@/lib/util/Granularity';
import {MoneyTimeseries} from '@/lib/util/Timeseries';
import {eachMonthOfInterval} from 'date-fns';

export function MonthlyCumulativeCashflow({
  input,
}: {
  input: ExchangedIntervalTransactions;
}) {
  const cashflow = new MoneyTimeseries(input.currency(), Granularity.MONTHLY);
  for (const {t, ownShare} of input.income()) {
    cashflow.increment(t.timestampEpoch, ownShare);
  }
  for (const {t, ownShare} of input.expenses()) {
    cashflow.increment(t.timestampEpoch, ownShare.negate());
  }
  const cumulative = new MoneyTimeseries(input.currency(), Granularity.MONTHLY);
  let current = AmountWithCurrency.zero(input.currency());
  for (const m of eachMonthOfInterval(input.interval())) {
    current = current.add(cashflow.get(m));
    cumulative.set(m, current);
  }
  return (
    <Charts.Line
      title={'Cumulative monthly cashflow'}
      granularity={Granularity.MONTHLY}
      currency={input.currency()}
      interval={input.interval()}
      data={cumulative}
    />
  );
}
