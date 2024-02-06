'use client';
import Charts from 'components/charts/interface';
import {useDisplayCurrency} from 'lib/context/DisplaySettingsContext';
import {TransactionsStatsInput} from 'lib/stats/TransactionsStatsInput';
import {MoneyTimeseries, runningAverage} from 'lib/util/Timeseries';
import {Granularity} from 'lib/util/Granularity';

export function AverageMonthlyIncome({input}: {input: TransactionsStatsInput}) {
  const displayCurrency = useDisplayCurrency();
  const data = new MoneyTimeseries(displayCurrency, Granularity.MONTHLY);
  for (const {t, ownShare} of input.incomeExchangedAllTime()) {
    data.increment(t.timestampEpoch, ownShare);
  }
  const average = runningAverage(data, 12);
  return (
    <Charts.Bar
      title={'Average monthly income (12 months running average)'}
      series={{data: average}}
      interval={input.interval()}
    />
  );
}
