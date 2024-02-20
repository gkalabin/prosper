import Charts from '@/components/charts/interface';
import {ExchangedIntervalTransactions} from '@/lib/ExchangedTransactions';
import {Granularity} from '@/lib/util/Granularity';
import {NumberTimeseries} from '@/lib/util/Timeseries';

export function TransactionCountByMonth({
  input,
}: {
  input: ExchangedIntervalTransactions;
}) {
  const data = new NumberTimeseries(Granularity.MONTHLY);
  for (const {t} of input.transactions()) {
    data.increment(t.timestampEpoch, 1);
  }
  return (
    <Charts.Bar
      title={'Number of transactions per month'}
      granularity={Granularity.MONTHLY}
      interval={input.interval()}
      data={data}
    />
  );
}
