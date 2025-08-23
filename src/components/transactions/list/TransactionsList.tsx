import {NewTransactionFormDialog} from '@/components/txform/TransactionForm';
import {Button} from '@/components/ui/button';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {fullAccountName, mustFindAccount} from '@/lib/model/Account';
import {CategoryTree, makeCategoryTree} from '@/lib/model/Category';
import {
  findAllPartiesAmount,
  findInitialBalanceAmount,
  findSentAmount,
} from '@/lib/model/queries/TransactionAmount';
import {transactionNoteOrNull} from '@/lib/model/queries/TransactionMetadata';
import {Transaction} from '@/lib/model/transactionNEW/Transaction';
import {cn} from '@/lib/utils';
import {ChevronDownIcon, ChevronRightIcon} from '@heroicons/react/24/outline';
import {format} from 'date-fns';
import {useState} from 'react';
import {TransactionDetails} from './TransactionDetails';

const TransactionTitle = ({t}: {t: Transaction}) => {
  const {banks, accounts} = useCoreDataContext();
  if (t.kind === 'TRANSFER') {
    const from = mustFindAccount(t.fromAccountId, accounts);
    const to = mustFindAccount(t.toAccountId, accounts);
    return (
      <>
        {fullAccountName(from, banks)} → {fullAccountName(to, banks)}
      </>
    );
  }
  if (t.kind === 'EXPENSE') {
    // TOOD: add more details for shared transactions.
    return <>{t.vendor}</>;
  }
  if (t.kind === 'INCOME') {
    return <>{t.payer}</>;
  }
  if (t.kind === 'INITIAL_BALANCE') {
    return <>Initial balance</>;
  }
  if (t.kind === 'NOOP') {
    return <>[NOOP] {t.counterparty}</>;
  }
  throw new Error(`Unknown transaction type ${t}`);
};

function TransactionAmount(props: {transaction: Transaction}) {
  const {accounts, stocks} = useCoreDataContext();
  const t = props.transaction;
  switch (t.kind) {
    case 'EXPENSE':
    case 'INCOME':
      const allParties = findAllPartiesAmount({t, stocks});
      return (
        <>
          {t.kind === 'INCOME' ? '+' : '-'}
          {allParties.format()}
        </>
      );
    case 'TRANSFER':
      const sent = findSentAmount({t, accounts, stocks});
      return <>{sent.format()}</>;
    case 'INITIAL_BALANCE':
      const balance = findInitialBalanceAmount({t, accounts, stocks});
      return <>{balance.format()}</>;
    case 'NOOP':
      return <>0</>;
    default:
      const _exhaustiveCheck: never = t;
      throw new Error(`Unknown transaction ${_exhaustiveCheck}`);
  }
}

export const TransactionsListItem = ({
  transaction: t,
  categoryTree,
}: {
  transaction: Transaction;
  categoryTree: CategoryTree;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const note = transactionNoteOrNull(t);
  return (
    <div className="p-2">
      <div
        className="flex cursor-pointer flex-row"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="grow">
          <div>
            <TransactionTitle t={t} />
          </div>
          {note && <div className="text-xs italic text-gray-600">{note}</div>}
          <div
            className="text-xs text-gray-600"
            suppressHydrationWarning={true}
          >
            {format(t.timestampEpoch, 'yyyy-MM-dd HH:mm')}
          </div>
        </div>
        <div
          className={cn('self-center pr-2 text-lg', {
            'text-green-900': t.kind === 'INCOME',
          })}
        >
          <TransactionAmount transaction={t} />
        </div>
        <div className="self-center">
          {!expanded && <ChevronRightIcon className="inline h-4 w-4" />}
          {expanded && <ChevronDownIcon className="inline h-4 w-4" />}
        </div>
      </div>

      {expanded && (
        <div className="pl-1">
          <TransactionDetails transaction={t} categoryTree={categoryTree} />
        </div>
      )}
      {expanded && (
        <div className="pl-1">
          <Button
            variant="link"
            size="inherit"
            onClick={() => setShowEditForm(true)}
          >
            Edit
          </Button>
        </div>
      )}
      {showEditForm && (
        <NewTransactionFormDialog
          transaction={t}
          open={showEditForm}
          onOpenChange={setShowEditForm}
        />
      )}
    </div>
  );
};

export const TransactionsList = (props: {
  transactions: Transaction[];
  displayLimit?: number;
}) => {
  const [displayLimit, setDisplayLimit] = useState(props.displayLimit || 10);
  const {categories} = useCoreDataContext();
  if (!props.transactions?.length) {
    return <div>No transactions.</div>;
  }
  const displayTransactions = [...props.transactions].slice(0, displayLimit);
  const categoryTree = makeCategoryTree(categories);
  return (
    <>
      <div className="flex-1 rounded border border-gray-200">
        <ul className="flex flex-col divide-y divide-gray-200">
          {displayTransactions.map(t => (
            <TransactionsListItem
              key={t.transactionId}
              transaction={t}
              categoryTree={categoryTree}
            />
          ))}
          <li className="bg-slate-50 p-2 text-center text-lg font-medium">
            Displaying
            {displayTransactions.length == props.transactions.length
              ? ` all ${displayTransactions.length} `
              : ` ${displayTransactions.length} of ${props.transactions.length} `}
            transactions.
            {displayTransactions.length < props.transactions.length && (
              <p>
                Show
                <button
                  onClick={() => setDisplayLimit(displayLimit + 10)}
                  className="ml-2 mr-1 text-indigo-600 hover:text-indigo-500"
                >
                  10
                </button>
                <button
                  onClick={() => setDisplayLimit(displayLimit + 100)}
                  className="ml-1 mr-2 text-indigo-600 hover:text-indigo-500"
                >
                  100
                </button>
                more
              </p>
            )}
          </li>
        </ul>
      </div>
    </>
  );
};
