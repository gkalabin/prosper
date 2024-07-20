import {ChevronDownIcon, ChevronRightIcon} from '@heroicons/react/24/outline';
import {TransactionAPIResponse} from '@/app/api/transaction/dbHelpers';
import classNames from 'classnames';
import {AddTransactionForm} from '@/components/txform/AddTransactionForm';
import {ButtonLink} from '@/components/ui/buttons';
import {format} from 'date-fns';
import {AmountWithUnit} from '@/lib/AmountWithUnit';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {fullAccountName} from '@/lib/model/BankAccount';
import {
  CategoryTree,
  getNameWithAncestors,
  makeCategoryTree,
} from '@/lib/model/Category';
import {
  Transaction,
  isExpense,
  isIncome,
  isPersonalExpense,
  isThirdPartyExpense,
  isTransfer,
  otherPartyNameOrNull,
  transactionBankAccount,
  transactionUnit,
} from '@/lib/model/transaction/Transaction';
import {
  amountReceived,
  amountSent,
  incomingBankAccount,
  outgoingBankAccount,
} from '@/lib/model/transaction/Transfer';
import {
  ownShareAmountIgnoreRefunds,
  paidTotal,
} from '@/lib/model/transaction/amounts';
import {useState} from 'react';

const TransactionTitle = ({t}: {t: Transaction}) => {
  const {banks, bankAccounts} = useAllDatabaseDataContext();
  if (isTransfer(t)) {
    const from = outgoingBankAccount(t, bankAccounts);
    const to = incomingBankAccount(t, bankAccounts);
    return (
      <>
        {fullAccountName(from, banks)} → {fullAccountName(to, banks)}
      </>
    );
  }
  if (isPersonalExpense(t)) {
    return (
      <>
        {t.vendor}{' '}
        {otherPartyNameOrNull(t) && (
          <small>split with {otherPartyNameOrNull(t)}</small>
        )}
      </>
    );
  }
  if (isThirdPartyExpense(t)) {
    return (
      <>
        {t.vendor} <small>paid by {t.payer}</small>
      </>
    );
  }
  if (isIncome(t)) {
    return (
      <>
        {t.payer}{' '}
        {otherPartyNameOrNull(t) && (
          <small>split with {otherPartyNameOrNull(t)}</small>
        )}
      </>
    );
  }
  throw new Error(`Unknown transaction type ${t}`);
};

const TransactionAmount = (props: {transaction: Transaction}) => {
  const {bankAccounts, stocks} = useAllDatabaseDataContext();
  const t = props.transaction;
  switch (t.kind) {
    case 'PersonalExpense':
    case 'ThirdPartyExpense':
    case 'Income':
      const a = new AmountWithUnit({
        amountCents: t.amountCents,
        unit: transactionUnit(t, bankAccounts, stocks),
      });
      return (
        <>
          {isIncome(t) ? '+' : ''}
          {a.format()}
        </>
      );
    case 'Transfer':
      const sent = amountSent(t, bankAccounts, stocks);
      return <>{sent.format()}</>;
    default:
      const _exhaustiveCheck: never = t;
      throw new Error(`Unknown transaction ${_exhaustiveCheck}`);
  }
};

export const TransactionsListItem = ({
  transaction: t,
  categoryTree,
  onUpdated,
}: {
  transaction: Transaction;
  categoryTree: CategoryTree;
  onUpdated: (response: TransactionAPIResponse) => void;
}) => {
  const [showRawDetails, setShowRawDetails] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const raw = JSON.stringify(t, null, 2);
  const {tags, bankAccounts, banks, stocks, trips} =
    useAllDatabaseDataContext();
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
          <div className="text-xs italic text-gray-600">{t.note}</div>
          <div
            className="text-xs text-gray-600"
            suppressHydrationWarning={true}
          >
            {format(t.timestampEpoch, 'yyyy-MM-dd HH:mm')}
          </div>
        </div>
        <div
          className={classNames('self-center pr-2 text-lg', {
            'text-green-900': isIncome(t),
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
          <div>ID: {t.id}</div>
          <div suppressHydrationWarning={true}>
            Time: {new Date(t.timestampEpoch).toISOString()}
          </div>
          <div>Type: {t.kind}</div>
          <div>
            Category: {getNameWithAncestors(t.categoryId, categoryTree)}
          </div>
          {t.note && <div>Note: {t.note}</div>}
          {isExpense(t) && <div>Vendor: {t.vendor}</div>}
          {otherPartyNameOrNull(t) && (
            <div>Other party: {otherPartyNameOrNull(t)}</div>
          )}
          {isIncome(t) && <div>Payer: {t.payer}</div>}
          {isPersonalExpense(t) && (
            <div>
              Account from:{' '}
              {fullAccountName(transactionBankAccount(t, bankAccounts), banks)}
            </div>
          )}
          {isIncome(t) && (
            <div>
              Account to:{' '}
              {fullAccountName(transactionBankAccount(t, bankAccounts), banks)}
            </div>
          )}
          {isTransfer(t) && (
            <div>
              Account from:{' '}
              {fullAccountName(outgoingBankAccount(t, bankAccounts), banks)}
            </div>
          )}
          {isTransfer(t) && (
            <div>
              Account to:{' '}
              {fullAccountName(incomingBankAccount(t, bankAccounts), banks)}
            </div>
          )}
          {(isExpense(t) || isIncome(t)) && (
            <div>
              Full amount: {paidTotal(t, bankAccounts, stocks).format()}
            </div>
          )}
          {(isExpense(t) || isIncome(t)) && (
            <div>
              Own share:{' '}
              {ownShareAmountIgnoreRefunds(t, bankAccounts, stocks).format()}
            </div>
          )}
          {isTransfer(t) && (
            <div>Sent: {amountSent(t, bankAccounts, stocks).format()}</div>
          )}
          {isTransfer(t) && (
            <div>
              Received: {amountReceived(t, bankAccounts, stocks).format()}
            </div>
          )}
          {t.tagsIds.length > 0 && (
            <div>
              Tags:{' '}
              {t.tagsIds
                .map(tt => tags.find(x => x.id == tt)?.name ?? '')
                .join(', ')}
            </div>
          )}
          {(isExpense(t) || isIncome(t)) && t.tripId && (
            <div>
              Trip:{' '}
              {trips.find(trip => trip.id == t.tripId)?.name ?? 'Unknown trip'}
            </div>
          )}
        </div>
      )}

      {expanded && (
        <div className="space-x-2 pl-1">
          {!showEditForm && (
            <ButtonLink onClick={() => setShowEditForm(true)}>Edit</ButtonLink>
          )}
          <ButtonLink onClick={() => setShowRawDetails(!showRawDetails)}>
            {showRawDetails ? 'Hide' : 'Show'} raw details
          </ButtonLink>
        </div>
      )}

      {expanded && showRawDetails && <pre className="text-xs">{raw}</pre>}
      {expanded && showEditForm && (
        <div>
          <AddTransactionForm
            transaction={t}
            onAddedOrUpdated={updated => {
              onUpdated(updated);
              setShowEditForm(false);
            }}
            onClose={() => setShowEditForm(false)}
          />
        </div>
      )}
    </div>
  );
};

export const TransactionsList = (props: {
  transactions: Transaction[];
  onTransactionUpdated: (response: TransactionAPIResponse) => void;
  displayLimit?: number;
}) => {
  const [displayLimit, setDisplayLimit] = useState(props.displayLimit || 10);
  const {categories} = useAllDatabaseDataContext();
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
              key={t.id}
              transaction={t}
              categoryTree={categoryTree}
              onUpdated={props.onTransactionUpdated}
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
