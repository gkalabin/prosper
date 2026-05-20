import {Charts} from '@/components/charts';
import {ExchangedIntervalTransactions} from '@/lib/ExchangedTransactions';
import {Granularity} from '@/lib/util/Granularity';
import {MoneyTimeseries} from '@/lib/util/Timeseries';
import {differenceInYears} from 'date-fns';

export function YearlyCashflow({
  input,
}: {
  input: ExchangedIntervalTransactions;
}) {
  const cashflow = new MoneyTimeseries(input.currency(), Granularity.YEARLY);
  for (const {t, ownShare} of input.income()) {
    cashflow.increment(t.timestampEpoch, ownShare);
  }
  for (const {t, ownShare} of input.expenses()) {
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
      currency={input.currency()}
      data={cashflow}
    />
  );
}
