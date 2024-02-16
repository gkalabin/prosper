'use client';
import Charts from '@/components/charts/interface';
import {ExchangedIntervalTransactions} from '@/lib/ExchangedTransactions';
import {Granularity} from '@/lib/util/Granularity';
import {MoneyTimeseries} from '@/lib/util/Timeseries';
import {differenceInYears} from 'date-fns';

export function YearlyIncome({input}: {input: ExchangedIntervalTransactions}) {
  const data = new MoneyTimeseries(input.currency(), Granularity.YEARLY);
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
