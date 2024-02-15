'use client';
import Charts from '@/components/charts/interface';
import {ExchangedTransactions} from '@/lib/ExchangedTransactions';
import {Granularity} from '@/lib/util/Granularity';
import {MoneyTimeseries, runningAverage} from '@/lib/util/Timeseries';

export function MonthlyAverageCashflow({
  input,
}: {
  input: ExchangedTransactions;
}) {
  const cashflow = new MoneyTimeseries(input.currency(), Granularity.MONTHLY);
  for (const {t, ownShare} of input.incomeAllTime()) {
    cashflow.increment(t.timestampEpoch, ownShare);
  }
  for (const {t, ownShare} of input.expensesAllTime()) {
    cashflow.increment(t.timestampEpoch, ownShare.negate());
  }
  return (
    <Charts.Bar
      title={'Cashflow 12 months running average'}
      granularity={Granularity.MONTHLY}
      currency={input.currency()}
      interval={input.interval()}
      data={runningAverage(cashflow, 12)}
    />
  );
}
