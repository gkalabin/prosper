import Charts from '@/components/charts/interface';
import {Transaction} from '@/lib/model/transaction/Transaction';
import {Granularity} from '@/lib/util/Granularity';
import {NumberTimeseries} from '@/lib/util/Timeseries';
import {type Interval} from 'date-fns';

export function TransactionCountByMonth({
  transactions,
  duration,
}: {
  transactions: Transaction[];
  duration: Interval;
}) {
  const data = new NumberTimeseries(Granularity.MONTHLY);
  for (const t of transactions) {
    data.increment(t.timestampEpoch, 1);
  }
  return (
    <Charts.Bar
      title={'Number of transactions per month'}
      granularity={Granularity.MONTHLY}
      interval={duration}
      data={data}
    />
  );
}
