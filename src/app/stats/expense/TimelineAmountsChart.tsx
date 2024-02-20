import Charts from '@/components/charts/interface';
import {Amount} from '@/lib/Amount';
import {AmountWithCurrency} from '@/lib/AmountWithCurrency';
import {Currency} from '@/lib/model/Currency';
import {Granularity} from '@/lib/util/Granularity';
import {MoneyTimeseries} from '@/lib/util/Timeseries';
import {Interval} from 'date-fns';

type TimelineAmountsChartProps = {
  title: string;
  timeline: Interval<Date>;
  currency: Currency;
  granularity: Granularity;
  data: Array<{
    timestamp: number;
    amount: Amount;
  }>;
};

export function TimelineAmountsChart({
  title,
  timeline,
  currency,
  granularity,
  data,
}: TimelineAmountsChartProps) {
  const timeseries = new MoneyTimeseries(currency, granularity);
  for (const {timestamp, amount} of data) {
    timeseries.increment(
      timestamp,
      new AmountWithCurrency({
        amountCents: amount.cents(),
        currency,
      })
    );
  }
  return (
    <Charts.Bar
      title={title}
      granularity={granularity}
      currency={currency}
      interval={timeline}
      data={timeseries}
    />
  );
}
