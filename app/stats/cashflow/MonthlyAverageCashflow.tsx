'use client';
import Charts from 'components/charts/interface';
import {useDisplayCurrency} from 'lib/context/DisplaySettingsContext';
import {TransactionsStatsInput} from 'lib/stats/TransactionsStatsInput';
import {MoneyTimeseries, runningAverage} from 'lib/util/Timeseries';
import {Granularity} from 'lib/util/Granularity';

export function MonthlyAverageCashflow({
  input,
}: {
  input: TransactionsStatsInput;
}) {
  const displayCurrency = useDisplayCurrency();
  const cashflow = new MoneyTimeseries(displayCurrency, Granularity.MONTHLY);
  for (const {t, ownShare} of input.incomeExchangedAllTime()) {
    cashflow.increment(t.timestampEpoch, ownShare);
  }
  for (const {t, ownShare} of input.expensesExchangedAllTime()) {
    cashflow.increment(t.timestampEpoch, ownShare.negate());
  }
  return (
    <Charts.Bar
      title={'Cashflow 12 months running average'}
      series={{data: runningAverage(cashflow, 12)}}
      interval={input.interval()}
    />
  );
}
