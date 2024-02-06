'use client';
import Charts from 'components/charts/interface';
import {useDisplayCurrency} from 'lib/context/DisplaySettingsContext';
import {TransactionsStatsInput} from 'lib/stats/TransactionsStatsInput';
import {MoneyTimeseries} from 'lib/util/Timeseries';
import {Granularity} from 'lib/util/Granularity';

export function MonthlyIncome({input}: {input: TransactionsStatsInput}) {
  const displayCurrency = useDisplayCurrency();
  const data = new MoneyTimeseries(displayCurrency, Granularity.MONTHLY);
  for (const {t, ownShare} of input.incomeExchanged()) {
    data.increment(t.timestampEpoch, ownShare);
  }
  return (
    <Charts.Bar
      title={'Monthly income'}
      series={{data}}
      interval={input.interval()}
    />
  );
}
