'use client';
import {MaybeHiddenDiv} from '@/app/(authenticated)/overview/hide-balances';
import {SignedDelta} from '@/app/(authenticated)/overview/signed-delta';
import {Charts} from '@/components/charts';
import {AmountWithCurrency} from '@/lib/AmountWithCurrency';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {useCurrentBalances} from '@/lib/context/CurrentBalancesContext';
import {useDisplayCurrency} from '@/lib/context/DisplaySettingsContext';
import {useMarketDataContext} from '@/lib/context/MarketDataContext';
import {useTransactionDataContext} from '@/lib/context/TransactionDataContext';
import {netWorthTimeline} from '@/lib/model/balances';
import {Transaction} from '@/lib/model/transaction/Transaction';
import {splitAmount} from '@/lib/util/util';
import {cn} from '@/lib/utils';
import {format, subMonths, subYears} from 'date-fns';
import {useState} from 'react';

const NET_WORTH_SAMPLE_COUNT = 192;

const RANGES = ['1M', '3M', '6M', '1Y', 'ALL'] as const;
type Range = (typeof RANGES)[number];

const RANGE_LABELS: Record<Range, string> = {
  '1M': '1 month',
  '3M': '3 months',
  '6M': '6 months',
  '1Y': '1 year',
  ALL: 'all time',
};

function rangeStart(
  range: Range,
  now: number,
  transactions: Transaction[]
): number {
  switch (range) {
    case '1M':
      return subMonths(now, 1).getTime();
    case '3M':
      return subMonths(now, 3).getTime();
    case '6M':
      return subMonths(now, 6).getTime();
    case '1Y':
      return subYears(now, 1).getTime();
    case 'ALL': {
      let earliest = now;
      for (const t of transactions) {
        if (t.timestampEpoch < earliest) {
          earliest = t.timestampEpoch;
        }
      }
      return earliest;
    }
  }
}

export function NetWorthHero() {
  const displayCurrency = useDisplayCurrency();
  const {bankAccounts, stocks} = useCoreDataContext();
  const {transactions} = useTransactionDataContext();
  const {exchange} = useMarketDataContext();
  const [range, setRange] = useState<Range>('1Y');
  const total = useCurrentBalances().sum(
    bankAccounts,
    displayCurrency,
    exchange
  );
  if (!total) {
    return null;
  }
  const now = Date.now();
  const timeline = netWorthTimeline(
    bankAccounts,
    displayCurrency,
    exchange,
    transactions,
    stocks,
    {start: rangeStart(range, now, transactions), end: now},
    NET_WORTH_SAMPLE_COUNT
  );
  const {whole, fraction} = splitAmount(total.format());
  return (
    <section className="px-1 py-4" aria-labelledby="net-worth-heading">
      <h2
        id="net-worth-heading"
        className="text-muted-foreground text-xs font-bold uppercase tracking-[0.16em]"
      >
        Net worth
      </h2>
      <MaybeHiddenDiv className="mt-2 flex items-baseline font-mono font-semibold tracking-tight">
        <span className="text-5xl">{whole}</span>
        {fraction && (
          <span className="text-muted-foreground text-2xl font-medium">
            {fraction}
          </span>
        )}
      </MaybeHiddenDiv>
      {timeline.length >= 2 && (
        <>
          <div className="mt-3 font-mono text-sm font-semibold">
            <NetWorthChange range={range} timeline={timeline} />
          </div>
          <RangeTabs range={range} onChange={setRange} />
          <div className="mt-4">
            <Charts.Sparkline
              title="Net worth"
              currency={displayCurrency}
              data={timeline}
            />
            <NetWorthEndpoints timeline={timeline} />
          </div>
        </>
      )}
    </section>
  );
}

function NetWorthChange({
  range,
  timeline,
}: {
  range: Range;
  timeline: Array<{timestamp: number; amount: AmountWithCurrency}>;
}) {
  const first = timeline[0].amount;
  const last = timeline[timeline.length - 1].amount;
  const delta = last.subtract(first);
  return <SignedDelta delta={delta} label={RANGE_LABELS[range]} base={first} />;
}

function NetWorthEndpoints({
  timeline,
}: {
  timeline: Array<{timestamp: number; amount: AmountWithCurrency}>;
}) {
  const first = timeline[0];
  const last = timeline[timeline.length - 1];
  return (
    <div className="text-muted-foreground mt-2 flex items-center justify-between font-mono text-xs">
      <div data-testid="net-worth-range-start">
        {format(first.timestamp, "MMM ''yy")} ·{' '}
        <MaybeHiddenDiv className="inline-block">
          {first.amount.round().format()}
        </MaybeHiddenDiv>
      </div>
      <div data-testid="net-worth-range-end">
        Today ·{' '}
        <MaybeHiddenDiv className="inline-block">
          {last.amount.round().format()}
        </MaybeHiddenDiv>
      </div>
    </div>
  );
}

function RangeTabs({
  range,
  onChange,
}: {
  range: Range;
  onChange: (r: Range) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Net worth time range"
      className="mt-4 flex gap-1.5"
    >
      {RANGES.map(r => (
        <button
          key={r}
          type="button"
          role="tab"
          aria-selected={r === range}
          aria-label={RANGE_LABELS[r]}
          onClick={() => onChange(r)}
          className={cn(
            'rounded-lg px-3 py-1 font-mono text-xs font-semibold transition-colors',
            r === range
              ? 'bg-secondary text-foreground'
              : 'text-muted-foreground hover:bg-accent'
          )}
        >
          {r}
        </button>
      ))}
    </div>
  );
}
