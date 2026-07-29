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

const DEFAULT_RANGE: Range = '1Y';

const RANGE_LABELS: Record<Range, string> = {
  '1M': '1 month',
  '3M': '3 months',
  '6M': '6 months',
  '1Y': '1 year',
  ALL: 'all time',
};

function rangeStart(range: Range, earliest: number): number {
  const now = Date.now();
  switch (range) {
    case '1M':
      return subMonths(now, 1).getTime();
    case '3M':
      return subMonths(now, 3).getTime();
    case '6M':
      return subMonths(now, 6).getTime();
    case '1Y':
      return subYears(now, 1).getTime();
    case 'ALL':
      return earliest;
  }
}

// Timestamp of the first recorded transaction, or null when there are none.
function earliestTimestamp(transactions: Transaction[]): number | null {
  if (transactions.length === 0) {
    return null;
  }
  let earliest = transactions[0].timestampEpoch;
  for (const t of transactions) {
    earliest = Math.min(earliest, t.timestampEpoch);
  }
  return earliest;
}

// Ranges worth offering as tabs. A range makes the cut only when the
// previous, shorter one does not already cover the full history.
function availableRanges(earliest: number): Range[] {
  const available: Range[] = [RANGES[0]];
  for (const range of RANGES.slice(1)) {
    const previous = available[available.length - 1];
    if (earliest >= rangeStart(previous, earliest)) {
      break;
    }
    available.push(range);
  }
  return available;
}

export function NetWorthHero() {
  const displayCurrency = useDisplayCurrency();
  const {bankAccounts} = useCoreDataContext();
  const {exchange} = useMarketDataContext();
  const total = useCurrentBalances().sum(
    bankAccounts,
    displayCurrency,
    exchange
  );
  if (!total) {
    return null;
  }
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
      <NetWorthHistory />
    </section>
  );
}

// Sparkline of the net worth over a selectable time range.
// Renders nothing when there is no recorded history to chart.
function NetWorthHistory() {
  const displayCurrency = useDisplayCurrency();
  const {bankAccounts, stocks} = useCoreDataContext();
  const {transactions} = useTransactionDataContext();
  const {exchange} = useMarketDataContext();
  const [selectedRange, setSelectedRange] = useState<Range>(DEFAULT_RANGE);
  const earliest = earliestTimestamp(transactions);
  if (earliest === null) {
    return null;
  }
  const ranges = availableRanges(earliest);
  const range = ranges.includes(selectedRange)
    ? selectedRange
    : ranges[ranges.length - 1];
  const timeline = netWorthTimeline(
    bankAccounts,
    displayCurrency,
    exchange,
    transactions,
    stocks,
    {start: rangeStart(range, earliest), end: Date.now()},
    NET_WORTH_SAMPLE_COUNT
  );
  if (timeline.length < 2) {
    return null;
  }
  return (
    <>
      <div className="mt-3 font-mono text-sm font-semibold">
        <NetWorthChange range={range} timeline={timeline} />
      </div>
      {ranges.length > 1 && (
        <RangeTabs ranges={ranges} range={range} onChange={setSelectedRange} />
      )}
      <div className="mt-4">
        <Charts.Sparkline
          title="Net worth"
          currency={displayCurrency}
          data={timeline}
        />
        <NetWorthEndpoints timeline={timeline} />
      </div>
    </>
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
  ranges,
  range,
  onChange,
}: {
  ranges: Range[];
  range: Range;
  onChange: (r: Range) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Net worth time range"
      className="mt-4 flex gap-1.5"
    >
      {ranges.map(r => (
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
