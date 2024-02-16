'use client';
import Charts from '@/components/charts/interface';
import {ExchangedIntervalTransactions} from '@/lib/ExchangedTransactions';
import {AppendMap} from '@/lib/util/AppendMap';
import {topN} from '@/lib/util/stats';

const TOP_N = 10;

export function TopVendorsByTransactionCount({
  input,
}: {
  input: ExchangedIntervalTransactions;
}) {
  const counts = new AppendMap<string, number>((a, b) => a + b, 0);
  for (const {t} of input.expenses()) {
    counts.increment(t.vendor, 1);
  }
  // If there is just N+1 items, taking top N would result in only one item rolled into 'others'.
  // To avoid this, if there is N+1 items, just use all of them.
  const topItemsCount = TOP_N == counts.size - 1 ? TOP_N + 1 : TOP_N;
  const {top, otherSum, otherCount} = topN(counts, topItemsCount);
  top.push([`Other ${otherCount} vendors`, otherSum]);
  const data = top.map(([vendor, count]) => ({
    name: vendor,
    amount: count,
  }));
  return (
    <Charts.HorizontalBar
      title="Vendors by the number of transactions"
      data={data}
    />
  );
}
