'use client';
import {Charts} from '@/components/charts/interface';
import {Amount} from '@/lib/Amount';
import {ExchangedTransactions} from '@/lib/ExchangedTransactions';
import {currencyAppendMap} from '@/lib/util/AppendMap';
import {topN} from '@/lib/util/stats';

const TOP_N = 10;

export function VendorsByAmount({input}: {input: ExchangedTransactions}) {
  const byVendor = currencyAppendMap<string>(input.currency());
  for (const {t, ownShare} of input.expenses()) {
    byVendor.increment(t.vendor, ownShare);
  }
  // If there is just N+1 items, taking top N would result in only one item rolled into 'others'.
  // To avoid this, if there is N+1 items, just use all of them.
  const topItemsCount = TOP_N == byVendor.size - 1 ? TOP_N + 1 : TOP_N;
  const cents = new Map<string, number>(
    [...byVendor.entries()].map(([vendor, amount]) => [vendor, amount.cents()])
  );
  const {top, otherSum, otherCount} = topN(cents, topItemsCount);
  top.push([`Other ${otherCount} vendors`, otherSum]);
  const data = top.map(([vendor, amountCents]) => ({
    name: vendor,
    amount: new Amount({amountCents}),
  }));
  return (
    <Charts.HorizontalBar
      title="Vendors by the amount spent"
      data={data}
      currency={input.currency()}
    />
  );
}
