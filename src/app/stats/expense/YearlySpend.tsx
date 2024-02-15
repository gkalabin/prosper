'use client';
import Charts from '@/components/charts/interface';
import {ExchangedTransactions} from '@/lib/ExchangedTransactions';
import {Granularity} from '@/lib/util/Granularity';
import {MoneyTimeseries} from '@/lib/util/Timeseries';
import {differenceInYears} from 'date-fns';

export function YearlySpend({input}: {input: ExchangedTransactions}) {
  const data = new MoneyTimeseries(input.currency(), Granularity.YEARLY);
  for (const {t, ownShare} of input.expenses()) {
    data.increment(t.timestampEpoch, ownShare);
  }
  if (differenceInYears(input.interval().end, input.interval().start) < 1) {
    return <></>;
  }
  return (
    <Charts.Bar
      title={'Yearly spend'}
      granularity={Granularity.YEARLY}
      currency={input.currency()}
      interval={input.interval()}
      data={data}
    />
  );
}
