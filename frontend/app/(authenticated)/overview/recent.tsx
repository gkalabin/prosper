'use client';
import {TransactionsList} from '@/components/transactions/TransactionsList';
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
            className="text-muted-foreground text-xs font-bold uppercase tracking-[0.13em]"
          >
            Recent
          </h2>
          <div className="text-muted-foreground text-xs">
            Last {RECENT_WINDOW_DAYS} days
          </div>
        </div>
        <Link
          href="/transactions"
          className="text-muted-foreground hover:text-foreground inline-flex items-baseline gap-0.5 text-sm font-semibold"
        >
          All transactions
          <ChevronRightIcon className="h-4 w-4 self-center" />
        </Link>
      </div>
      <TransactionsList transactions={recent} />
    </section>
  );
}
