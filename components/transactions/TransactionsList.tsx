import React, { useState } from "react";
import { DbTransaction, Transaction } from "../../lib/model/Transaction";
import { currencyByTransaction, formatMoney } from "../../lib/Money";

export const Amount = (props: { t: Transaction }) => {
  const currency = currencyByTransaction(props.t);
  if (props.t.personalExpense) {
    return (
      <span className="text-red-900">
        {formatMoney(-props.t.amountCents, currency)}
      </span>
    );
  }
  if (props.t.thirdPartyExpense) {
    return (
      <span className="text-red-900">
        {formatMoney(-props.t.amountCents, currency)}
      </span>
    );
  }
  if (props.t.transfer) {
    return <span>{formatMoney(props.t.amountCents, currency)}</span>;
  }
  if (props.t.income) {
    return (
      <span className="text-green-900">
        {formatMoney(+props.t.amountCents, currency)}
      </span>
    );
  }
  return <span>{formatMoney(props.t.amountCents, currency)}</span>;
};

export const TransactionHeading = (props: { t: Transaction }) => {
  if (props.t.personalExpense) {
    return <>{props.t.personalExpense.vendor}</>;
  }
  if (props.t.thirdPartyExpense) {
    return <>{props.t.thirdPartyExpense.vendor}</>;
  }
  if (props.t.transfer) {
    const from = props.t.transfer.accountFrom;
    const to = props.t.transfer.accountTo;
    if (from.bank.id == to.bank.id) {
      return (
        <>
          {from.bank.name}: {from.name} → {to.name}
        </>
      );
    }
    return (
      <>
        {from.bank.name}: {from.name} → {to.bank.name}: {to.name}
      </>
    );
  }
  if (props.t.income) {
    return <>{props.t.income.vendor || props.t.description}</>;
  }
  return <>{props.t.description}</>;
};

export const TransactionDescription = (props: { t: Transaction }) => {
  if (
    props.t.personalExpense ||
    props.t.thirdPartyExpense ||
    props.t.transfer
  ) {
    return <>{props.t.description}</>;
  }
  if (props.t.income && props.t.income.vendor) {
    return <>{props.t.description}</>;
  }
  return <></>;
};

export const TransactionStatusLine = (props: { t: Transaction }) => {
  if (props.t.personalExpense) {
    const from = props.t.personalExpense.account;
    return (
      <span className="rounded bg-gray-100 px-2 py-1">
        {from.bank.name}: {from.name}
      </span>
    );
  }
  if (props.t.thirdPartyExpense) {
    return <>{props.t.thirdPartyExpense.payer}</>;
  }
  if (props.t.income) {
    const to = props.t.income.account;
    return (
      <>
        {to.bank.name}: {to.name}
      </>
    );
  }
  return <></>;
};

type TransactionsListItemProps = {
  transaction: Transaction;
  onUpdated: (transaction: DbTransaction) => void;
};
export const TransactionsListItem: React.FC<TransactionsListItemProps> = (
  props
) => {
  const [showRawDetails, setShowRawDetails] = useState(false);
  const raw = JSON.stringify(props.transaction, null, 2);
  return (
    // TODO: add date and category
    <li className="flex flex-col gap-2 p-2">
      <div className="flex min-h-[theme('spacing[16]')] gap-2">
        <div className="min-w-[theme('spacing[20]')] flex-none whitespace-nowrap text-right text-lg font-medium text-gray-900">
          <Amount t={props.transaction} />
        </div>

        <div className="flex grow flex-col gap-1">
          <div className="text-base font-medium text-gray-900">
            <TransactionHeading t={props.transaction} />
          </div>
          <div className="grow text-sm text-gray-500">
            <TransactionDescription t={props.transaction} />
          </div>

          <div className="text-sm text-gray-500">
            <TransactionStatusLine t={props.transaction} />
          </div>
        </div>

        <div>
          <div className="flex h-full min-w-[theme('spacing[16]')] flex-col md:justify-end">
            <div className="flex flex-col gap-1 md:flex-row">
              <button className="font-medium text-indigo-600 hover:text-indigo-500">
                Edit
              </button>
              <button
                className="font-medium text-indigo-600 hover:text-indigo-500"
                onClick={() => setShowRawDetails(!showRawDetails)}
              >
                Raw
              </button>
            </div>
          </div>
        </div>
      </div>

      <div>{showRawDetails && <pre className="text-xs">{raw}</pre>}</div>
    </li>
  );
};

type TransactionsListProps = {
  transactions: Transaction[];
  onTransactionUpdated: (transaction: DbTransaction) => void;
};
export const TransactionsList: React.FC<TransactionsListProps> = (props) => {
  const [displayLimit, setDisplayLimit] = useState(1000);

  if (!props.transactions?.length) {
    return <div>No transactions.</div>;
  }

  const displayTransactions = []
    .concat(props.transactions)
    .slice(0, displayLimit);
  return (
    <div className="flex-1 rounded border border-gray-200">
      <ul role="list" className="flex flex-col divide-y divide-gray-200">
        {displayTransactions.map((t) => (
          <TransactionsListItem
            key={t.id}
            transaction={t}
            onUpdated={props.onTransactionUpdated}
          />
        ))}
      </ul>
      <button onClick={() => setDisplayLimit(displayLimit + 10)}>
        Show 10 more
      </button>
      <button onClick={() => setDisplayLimit(displayLimit + 100)}>
        Show 100 more
      </button>
    </div>
  );
};
