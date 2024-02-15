'use client';
import Charts from '@/components/charts/interface';
import {ExchangedTransactions} from '@/lib/ExchangedTransactions';
import {Granularity} from '@/lib/util/Granularity';
import {MoneyTimeseries, runningAverage} from '@/lib/util/Timeseries';

export function AverageMonthlyIncome({input}: {input: ExchangedTransactions}) {
  const data = new MoneyTimeseries(input.currency(), Granularity.MONTHLY);
  for (const {t, ownShare} of input.incomeAllTime()) {
    data.increment(t.timestampEpoch, ownShare);
  }
  return (
    <Charts.Bar
      title={'Average monthly income (12 months running average)'}
      granularity={Granularity.MONTHLY}
      currency={input.currency()}
      interval={input.interval()}
      data={runningAverage(data, 12)}
    />
  );
}
