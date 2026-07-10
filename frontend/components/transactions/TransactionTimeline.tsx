import {Pager, RowsCard} from '@/components/transactions/parts';
import {ExcludedKind, summarize} from '@/components/transactions/summary';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {AmountWithUnit} from '@/lib/AmountWithUnit';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {BankAccount} from '@/lib/model/BankAccount';
import {unitKey} from '@/lib/model/Unit';
import {Transaction} from '@/lib/model/transaction/Transaction';
import {cn} from '@/lib/utils';
import {ExclamationTriangleIcon} from '@heroicons/react/24/outline';
import {format, isThisYear, isToday, isYesterday, startOfDay} from 'date-fns';

type DayGroup = {
  epoch: number;
  transactions: Transaction[];
};

function groupByDay(transactions: Transaction[]): DayGroup[] {
  const groups = new Map<number, DayGroup>();
  for (const t of transactions) {
    const epoch = startOfDay(t.timestampEpoch).getTime();
    const group = groups.get(epoch);
    if (group) {
      group.transactions.push(t);
    } else {
      groups.set(epoch, {epoch, transactions: [t]});
    }
  }
  return [...groups.values()];
}

function dayHeading(epoch: number): string {
  if (isToday(epoch)) {
    return 'Today';
  }
  if (isYesterday(epoch)) {
    return 'Yesterday';
  }
  return format(epoch, isThisYear(epoch) ? 'EEE, d MMM' : 'EEE, d MMM yyyy');
}

// Transactions grouped by calendar day with per-day heading.
export const TransactionTimeline = (props: {
  transactions: Transaction[];
  perspective?: BankAccount;
}) => {
  return (
    <Pager transactions={props.transactions}>
      {shown => (
        <div className="space-y-5">
          {groupByDay(shown).map(day => (
            <div key={day.epoch}>
              <DayHeader group={day} perspective={props.perspective} />
              <RowsCard
                transactions={day.transactions}
                perspective={props.perspective}
              />
            </div>
          ))}
        </div>
      )}
    </Pager>
  );
};

function DayHeader({
  group,
  perspective,
}: {
  group: DayGroup;
  perspective?: BankAccount;
}) {
  return (
    <div className="flex items-baseline justify-between px-1 pb-2">
      <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
        {dayHeading(group.epoch)}
      </span>
      <DayNet transactions={group.transactions} perspective={perspective} />
    </div>
  );
}

// The day's net, with an explainer popover on days where some transactions
// don't count towards it.
function DayNet({
  transactions,
  perspective,
}: {
  transactions: Transaction[];
  perspective?: BankAccount;
}) {
  const {bankAccounts, stocks} = useCoreDataContext();
  const {net, exclusions} = summarize(
    transactions,
    bankAccounts,
    stocks,
    perspective
  );
  const netAmounts = net.map(({total}) => total);
  if (!exclusions.length) {
    return <Totals amounts={netAmounts} signed />;
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="hover:bg-secondary -mx-1.5 -my-1 flex cursor-pointer items-center gap-1 rounded-full px-1.5 py-1 transition-colors"
        >
          <Totals amounts={netAmounts} signed />
          <ExclamationTriangleIcon className="text-muted-foreground h-4 w-4 flex-none" />
          <span className="sr-only">What this net counts</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-3 text-xs">
        <p className="font-semibold">
          Money in minus money out of{' '}
          {perspective ? 'this account' : 'your accounts'}.
        </p>
        <p className="text-muted-foreground mt-2">Not counted:</p>
        <ul className="ml-4 mt-1 space-y-1">
          {exclusions.map(({kind, tallies}) => (
            <li
              key={kind}
              className="flex items-baseline justify-between gap-3"
            >
              <span className="text-muted-foreground">
                {exclusionLabel(
                  kind,
                  tallies.reduce((count, t) => count + t.count, 0)
                )}
              </span>
              <Totals amounts={tallies.map(({total}) => total)} />
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function exclusionLabel(kind: ExcludedKind, count: number): string {
  switch (kind) {
    case 'Transfer':
      return count == 1
        ? '1 transfer between your accounts'
        : `${count} transfers between your accounts`;
    case 'ThirdPartyExpense':
      return count == 1
        ? '1 expense paid by someone else'
        : `${count} expenses paid by someone else`;
    case 'OpeningBalance':
      return count == 1 ? '1 opening balance' : `${count} opening balances`;
  }
}

// Per-unit totals. Signed totals show an explicit sign and highlight gains;
// unsigned ones render as plain magnitudes.
function Totals({
  amounts,
  signed,
}: {
  amounts: AmountWithUnit[];
  signed?: boolean;
}) {
  return (
    <span className="flex items-baseline gap-2">
      {amounts.map(amount => (
        <span
          key={unitKey(amount.getUnit())}
          className={cn(
            'text-xs font-semibold tabular-nums',
            signed && amount.isPositive() ? 'text-up-amount' : 'text-foreground'
          )}
        >
          {signed ? amount.format({signDisplay: 'always'}) : amount.format()}
        </span>
      ))}
    </span>
  );
}
