import {TransactionRow} from '@/components/transactions/TransactionRow';
import {Button} from '@/components/ui/button';
import {TextButton} from '@/components/ui/text-button';
import {BankAccount} from '@/lib/model/BankAccount';
import {Transaction} from '@/lib/model/transaction/Transaction';
import {ReactNode, useState} from 'react';

const DEFAULT_DISPLAY_LIMIT = 20;
const LOAD_MORE_STEP = 12;
const LOAD_MANY_STEP = 100;

// Owns paging; children render the visible slice.
export function Pager({
  transactions,
  children,
}: {
  transactions: Transaction[];
  children: (shown: Transaction[]) => ReactNode;
}) {
  const [displayLimit, setDisplayLimit] = useState(DEFAULT_DISPLAY_LIMIT);
  if (!transactions?.length) {
    return (
      <div className="text-muted-foreground text-sm">No transactions.</div>
    );
  }
  const shown = transactions.slice(0, displayLimit);
  const total = transactions.length;
  return (
    <>
      {children(shown)}
      <ShowMoreFooter
        shownCount={shown.length}
        totalCount={total}
        onShowMore={step => setDisplayLimit(displayLimit + step)}
      />
    </>
  );
}

export function RowsCard({
  transactions,
  perspective,
}: {
  transactions: Transaction[];
  perspective?: BankAccount;
}) {
  return (
    <ul className="bg-card border-border divide-border divide-y overflow-hidden rounded-2xl border shadow-sm">
      {transactions.map(t => (
        <li key={t.id}>
          <TransactionRow transaction={t} perspective={perspective} />
        </li>
      ))}
    </ul>
  );
}

function ShowMoreFooter({
  shownCount,
  totalCount,
  onShowMore,
}: {
  shownCount: number;
  totalCount: number;
  onShowMore: (step: number) => void;
}) {
  if (shownCount >= totalCount) {
    return (
      <div className="text-muted-foreground mt-6 text-center text-xs">
        All {totalCount} shown
      </div>
    );
  }
  const remaining = totalCount - shownCount;
  return (
    <div className="mt-6 flex flex-col items-center gap-3">
      <div className="text-muted-foreground text-xs tabular-nums">
        Displaying <b className="text-foreground font-bold">{shownCount}</b> of{' '}
        {totalCount}
      </div>
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={() => onShowMore(LOAD_MORE_STEP)}>
          Load {Math.min(LOAD_MORE_STEP, remaining)} more
        </Button>
        {remaining > LOAD_MORE_STEP && (
          <TextButton tone="muted" onClick={() => onShowMore(LOAD_MANY_STEP)}>
            Load {Math.min(LOAD_MANY_STEP, remaining)} more
          </TextButton>
        )}
      </div>
    </div>
  );
}
