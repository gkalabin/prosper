'use client';
import Charts from '@/components/charts/interface';
import {useDisplayCurrency} from '@/lib/context/DisplaySettingsContext';
import {ExchangedTransactions} from '@/lib/ExchangedTransactions';
import {Granularity} from '@/lib/util/Granularity';
import {MoneyTimeseries} from '@/lib/util/Timeseries';

export function MonthlySpend({input}: {input: ExchangedTransactions}) {
  const displayCurrency = useDisplayCurrency();
  const data = new MoneyTimeseries(displayCurrency, Granularity.MONTHLY);
  for (const {t, ownShare} of input.expenses()) {
    data.increment(t.timestampEpoch, ownShare);
  }
  return (
    <Charts.Bar
      title={'Monthly spend'}
      granularity={Granularity.MONTHLY}
      currency={input.currency()}
      interval={input.interval()}
      data={data}
    />
  );
}
