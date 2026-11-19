'use client';
import {TransactionTimeline} from '@/components/transactions/TransactionTimeline';
import {useTransactionDataContext} from '@/lib/context/TransactionDataContext';
import {ChevronRightIcon} from '@heroicons/react/24/outline';
import {differenceInDays} from 'date-fns';
import Link from 'next/link';

const RECENT_WINDOW_DAYS = 7;

export function RecentTransactions() {
  const {transactions} = useTransactionDataContext();
  const now = Date.now();
  const recent = transactions
    .filter(t => differenceInDays(now, t.timestampEpoch) <= RECENT_WINDOW_DAYS)
    .sort((a, b) => b.timestampEpoch - a.timestampEpoch);
  return (
    <section aria-labelledby="recent-heading">
      <div className="mb-2 flex items-center justify-between px-1">
        <div>
          <h2
            id="recent-heading"
            className="text-xs font-bold uppercase tracking-[0.13em] text-muted-foreground"
          >
            Recent
          </h2>
          <div className="text-xs text-muted-foreground">
            Last {RECENT_WINDOW_DAYS} days
          </div>
        </div>
        <Link
          href="/transactions"
          className="inline-flex items-baseline gap-0.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          All transactions
          <ChevronRightIcon className="h-4 w-4 self-center" />
        </Link>
      </div>
      <TransactionTimeline transactions={recent} />
    </section>
  );
}
