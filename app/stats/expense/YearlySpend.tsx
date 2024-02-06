'use client';
import Charts from 'components/charts/interface';
import {differenceInYears} from 'date-fns';
import {useDisplayCurrency} from 'lib/context/DisplaySettingsContext';
import {TransactionsStatsInput} from 'lib/stats/TransactionsStatsInput';
import {MoneyTimeseries} from 'lib/util/Timeseries';
import {Granularity} from 'lib/util/Granularity';

export function YearlySpend({input}: {input: TransactionsStatsInput}) {
  const displayCurrency = useDisplayCurrency();
  const data = new MoneyTimeseries(displayCurrency, Granularity.YEARLY);
  for (const {t, ownShare} of input.expensesExchanged()) {
    data.increment(t.timestampEpoch, ownShare);
  }
  if (differenceInYears(input.interval().end, input.interval().start) < 1) {
    return <></>;
  }
  return (
    <Charts.Bar
      title={'Yearly spend'}
      series={{data}}
      interval={input.interval()}
    />
  );
}
