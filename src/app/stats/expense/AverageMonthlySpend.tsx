'use client';
import Charts from '@/components/charts/interface';
import {useDisplayCurrency} from '@/lib/context/DisplaySettingsContext';
import {TransactionsStatsInput} from '@/lib/stats/TransactionsStatsInput';
import {Granularity} from '@/lib/util/Granularity';
import {MoneyTimeseries, runningAverage} from '@/lib/util/Timeseries';

export function AverageMonthlySpend({input}: {input: TransactionsStatsInput}) {
  const displayCurrency = useDisplayCurrency();
  const data = new MoneyTimeseries(displayCurrency, Granularity.MONTHLY);
  for (const {t, ownShare} of input.expensesAllTime()) {
    data.increment(t.timestampEpoch, ownShare);
  }
  const average = runningAverage(data, 12);
  return (
    <Charts.Bar
      title={'Average monthly spend (12 months running average)'}
      granularity={Granularity.MONTHLY}
      currency={input.currency()}
      interval={input.interval()}
      data={average}
    />
  );
}
