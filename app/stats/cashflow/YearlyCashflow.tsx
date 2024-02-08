'use client';
import Charts from 'components/charts/interface';
import {differenceInYears} from 'date-fns';
import {useDisplayCurrency} from 'lib/context/DisplaySettingsContext';
import {TransactionsStatsInput} from 'lib/stats/TransactionsStatsInput';
import {Granularity} from 'lib/util/Granularity';
import {MoneyTimeseries} from 'lib/util/Timeseries';

export function YearlyCashflow({input}: {input: TransactionsStatsInput}) {
  const displayCurrency = useDisplayCurrency();
  const cashflow = new MoneyTimeseries(displayCurrency, Granularity.YEARLY);
  for (const {t, ownShare} of input.incomeExchanged()) {
    cashflow.increment(t.timestampEpoch, ownShare);
  }
  for (const {t, ownShare} of input.expensesExchanged()) {
    cashflow.increment(t.timestampEpoch, ownShare.negate());
  }
  if (differenceInYears(input.interval().end, input.interval().start) < 1) {
    return <></>;
  }
  return (
    <Charts.Bar
      title={'Yearly cashflow'}
      interval={input.interval()}
      granularity={Granularity.YEARLY}
      data={cashflow}
    />
  );
}
