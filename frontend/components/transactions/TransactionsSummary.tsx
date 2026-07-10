import {useExchangedTransactions} from '@/app/(authenticated)/stats/modelHelpers';
import {AmountWithCurrency} from '@/lib/AmountWithCurrency';
import {
  Transaction,
  isExpense,
  isIncome,
} from '@/lib/model/transaction/Transaction';
import {differenceInCalendarMonths, format} from 'date-fns';

// Human-readable length of the period the transactions cover, e.g. "1 mo" or "4.4 yrs".
function formatSpan(startEpoch: number, endEpoch: number): string {
  const months = differenceInCalendarMonths(endEpoch, startEpoch) + 1;
  if (months < 12) {
    return `${months} mo`;
  }
  const years = months / 12;
  const rounded = months % 12 === 0 ? years.toFixed(0) : years.toFixed(1);
  return `${rounded} yr${rounded === '1' ? '' : 's'}`;
}

function formatRange(startEpoch: number, endEpoch: number): string {
  return `${format(startEpoch, 'MMM yyyy')} – ${format(endEpoch, 'MMM yyyy')}`;
}

function span(
  transactions: Transaction[]
): {start: number; end: number} | null {
  if (!transactions.length) {
    return null;
  }
  let start = transactions[0].timestampEpoch;
  let end = start;
  for (const t of transactions) {
    start = Math.min(start, t.timestampEpoch);
    end = Math.max(end, t.timestampEpoch);
  }
  return {start, end};
}

function SummaryLayout({main, meta}: {main: string; meta: string | null}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="text-foreground truncate text-base font-bold tracking-tight">
        {main}
      </div>
      {meta && (
        <div className="text-muted-foreground mt-0.5 truncate text-sm">
          {meta}
        </div>
      )}
    </div>
  );
}

export function AllTransactionsSummary({
  transactions,
}: {
  transactions: Transaction[];
}) {
  const fullSpan = span(transactions);
  return (
    <SummaryLayout
      main={`${transactions.length} transactions`}
      meta={fullSpan ? formatRange(fullSpan.start, fullSpan.end) : null}
    />
  );
}

export function MatchedTransactionsSummary({
  transactions,
}: {
  transactions: Transaction[];
}) {
  const {input, failed} = useExchangedTransactions(transactions);

  let net = AmountWithCurrency.zero(input.currency());
  for (const {t, allParties} of input.transactions()) {
    if (isIncome(t)) {
      net = net.add(allParties);
    }
    if (isExpense(t)) {
      net = net.subtract(allParties);
    }
  }

  const matchedSpan = span(transactions);
  const meta = [
    `${net.round().format()} net`,
    matchedSpan && formatSpan(matchedSpan.start, matchedSpan.end),
    failed.length > 0 && `${failed.length} unconverted`,
  ]
    .filter(Boolean)
    .join(' · ');

  return <SummaryLayout main={`${transactions.length} matched`} meta={meta} />;
}
