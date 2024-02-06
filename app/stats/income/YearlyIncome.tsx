'use client';
import Charts from 'components/charts/interface';
import {differenceInYears} from 'date-fns';
import {useDisplayCurrency} from 'lib/context/DisplaySettingsContext';
import {TransactionsStatsInput} from 'lib/stats/TransactionsStatsInput';
import {MoneyTimeseries} from 'lib/util/Timeseries';
import {Granularity} from 'lib/util/Granularity';

export function YearlyIncome({input}: {input: TransactionsStatsInput}) {
  const displayCurrency = useDisplayCurrency();
  const data = new MoneyTimeseries(displayCurrency, Granularity.YEARLY);
  for (const {t, ownShare} of input.incomeExchanged()) {
    data.increment(t.timestampEpoch, ownShare);
  }
  if (differenceInYears(input.interval().end, input.interval().start) < 1) {
    return <></>;
  }
  return (
    <Charts.Bar
      title={'Yearly income'}
      series={{data}}
      interval={input.interval()}
    />
  );
}
