import {Charts} from '@/components/charts/interface';
import {ExchangedIntervalTransactions} from '@/lib/ExchangedTransactions';
import {Granularity} from '@/lib/util/Granularity';
import {MoneyTimeseries, runningAverage} from '@/lib/util/Timeseries';

export function MonthlyExpenseAverage({
  input,
}: {
  input: ExchangedIntervalTransactions;
}) {
  const data = new MoneyTimeseries(input.currency(), Granularity.MONTHLY);
  for (const {t, ownShare} of input.expensesAllTime()) {
    data.increment(t.timestampEpoch, ownShare);
  }
  const average = runningAverage(data, 12);
  return (
    <Charts.Bar
      title={'Average monthly spend (12 months running average)'}
      granularity={Granularity.MONTHLY}
      currency={input.currency()}
      interval={input.interval()}
      data={average}
    />
  );
}
