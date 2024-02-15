'use client';
import Charts from '@/components/charts/interface';
import {differenceInYears} from 'date-fns';
import {useDisplayCurrency} from '@/lib/context/DisplaySettingsContext';
import {ExchangedTransactions} from '@/lib/ExchangedTransactions';
import {Granularity} from '@/lib/util/Granularity';
import {MoneyTimeseries} from '@/lib/util/Timeseries';

export function YearlyIncome({input}: {input: ExchangedTransactions}) {
  const displayCurrency = useDisplayCurrency();
  const data = new MoneyTimeseries(displayCurrency, Granularity.YEARLY);
  for (const {t, ownShare} of input.income()) {
    data.increment(t.timestampEpoch, ownShare);
  }
  if (differenceInYears(input.interval().end, input.interval().start) < 1) {
    return <></>;
  }
  return (
    <Charts.Bar
      title={'Yearly income'}
      granularity={Granularity.YEARLY}
      currency={input.currency()}
      interval={input.interval()}
      data={data}
    />
  );
}
