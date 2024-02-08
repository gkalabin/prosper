'use client';
import Charts from 'components/charts/interface';
import {useDisplayCurrency} from 'lib/context/DisplaySettingsContext';
import {TransactionsStatsInput} from 'lib/stats/TransactionsStatsInput';
import {Granularity} from 'lib/util/Granularity';
import {MoneyTimeseries} from 'lib/util/Timeseries';

export function MonthlyCashflow({input}: {input: TransactionsStatsInput}) {
  const displayCurrency = useDisplayCurrency();
  const cashflow = new MoneyTimeseries(displayCurrency, Granularity.MONTHLY);
  for (const {t, ownShare} of input.incomeExchanged()) {
    cashflow.increment(t.timestampEpoch, ownShare);
  }
  for (const {t, ownShare} of input.expensesExchanged()) {
    cashflow.increment(t.timestampEpoch, ownShare.negate());
  }
  return (
    <Charts.Bar
      title={'Monthly cashflow'}
      granularity={Granularity.MONTHLY}
      interval={input.interval()}
      data={cashflow}
    />
  );
}
