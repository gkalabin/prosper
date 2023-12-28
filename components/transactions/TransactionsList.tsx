import { Transaction as DBTransaction } from "@prisma/client";
import { Amount } from "components/Amount";
import { AddTransactionForm } from "components/transactions/AddTransactionForm";
import { Bank, BankAccount } from "lib/model/BankAccount";
import { Category } from "lib/model/Category";
import { Currency } from "lib/model/Currency";
import { Transaction } from "lib/model/Transaction";
import { descriptiveDateTime, shortRelativeDate } from "lib/TimeHelpers";
import React, { useState } from "react";

const transactionHeadingText = (t: Transaction) => {
  if (t.vendor()) {
    return t.vendor();
  }
  if (t.isTransfer()) {
    const from = t.accountFrom();
    const to = t.accountTo();
    if (from.bank.id == to.bank.id) {
      return `${from.bank.name}: ${from.name} → ${to.name}`;
    }
    return `${from.bank.name}: ${from.name} → ${to.bank.name}: ${to.name}`;
  }
  return t.description;
};

export const TransactionHeading = (props: { t: Transaction }) => {
  return <>{transactionHeadingText(props.t)}</>;
};

export const TransactionDescription = (props: { t: Transaction }) => {
  if (transactionHeadingText(props.t) != props.t.description) {
    return <>{props.t.description}</>;
  }
  return <></>;
};

const TransactionStatusLine = (props: {
  t: Transaction;
  showBankAccountInStatusLine: boolean;
}) => {
  if (props.t.isPersonalExpense()) {
    const maybeBankAccount = props.showBankAccountInStatusLine && (
      <BankAccountLabel account={props.t.accountFrom()} />
    );
    return <>{maybeBankAccount}</>;
  }
  if (props.t.isThirdPartyExpense()) {
    return <>{props.t.thirdPartyExpense.payer}</>;
  }
  if (props.t.isIncome()) {
    const maybeBankAccount = props.showBankAccountInStatusLine && (
      <BankAccountLabel account={props.t.accountTo()} />
    );
    return <>{maybeBankAccount}</>;
  }
  return <></>;
};

const BankAccountLabel = (props: { account: BankAccount }) => {
  return (
    <span className="rounded bg-gray-100 px-2 py-1">
      {props.account.bank.name}: {props.account.name}
    </span>
  );
};

const TransactionTimestamp = (props: { t: Transaction }) => {
  const [showShort, setShowShort] = useState(true);
  const longFormat = descriptiveDateTime(props.t.timestamp);
  // TODO: show tooltip on click instead of changing the contents
  return (
    <span onClick={() => setShowShort(!showShort)} title={longFormat}>
      {(showShort && shortRelativeDate(props.t.timestamp)) || longFormat}
    </span>
  );
};

type TransactionsListItemProps = {
  banks: Bank[];
  categories: Category[];
  currencies: Currency[];
  transaction: Transaction;
  onUpdated: (transaction: DBTransaction) => void;
  showBankAccountInStatusLine: boolean;
};
export const TransactionsListItem: React.FC<TransactionsListItemProps> = (
  props
) => {
  const [showRawDetails, setShowRawDetails] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const raw = JSON.stringify(props.transaction.dbValue, null, 2);
  return (
    // TODO: add date and category
    <li className="flex flex-col gap-2 p-2">
      <div className="flex min-h-[theme('spacing[16]')] gap-2">
        <div className="min-w-[theme('spacing[20]')] flex-none whitespace-nowrap text-right text-lg font-medium text-gray-900">
          <Amount
            amountCents={props.transaction.amountCents}
            sign={props.transaction.amountSign()}
            // TODO: fix for transfers
            currency={props.transaction.currency()}
          />
        </div>

        <div className="flex grow flex-col gap-1">
          <div className="text-base font-medium text-gray-900">
            <TransactionHeading t={props.transaction} />
          </div>
          <div className="grow text-sm text-gray-500">
            <TransactionDescription t={props.transaction} />
          </div>

          <div className="text-sm text-gray-500">
            <TransactionStatusLine
              t={props.transaction}
              showBankAccountInStatusLine={props.showBankAccountInStatusLine}
            />
          </div>
        </div>

        <div className=" flex min-w-[theme('spacing[16]')] flex-col justify-between">
          <div className="text-sm text-gray-500">
            <TransactionTimestamp t={props.transaction} />
          </div>

          <div className="flex flex-col gap-1 md:flex-row">
            <button
              onClick={() => setShowEditForm(true)}
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
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

      {showRawDetails && (
        <div>
          <pre className="text-xs">{raw}</pre>
        </div>
      )}
      {showEditForm && (
        <div>
          <AddTransactionForm
            transaction={props.transaction}
            categories={props.categories}
            banks={props.banks}
            currencies={props.currencies}
            onAdded={(updated) => {
              props.onUpdated(updated);
              setShowEditForm(false);
            }}
            onClose={() => setShowEditForm(false)}
          />
        </div>
      )}
    </li>
  );
};

type TransactionsListProps = {
  banks: Bank[];
  categories: Category[];
  currencies: Currency[];
  transactions: Transaction[];
  onTransactionUpdated: (transaction: DBTransaction) => void;
  displayLimit?: number;
  showBankAccountInStatusLine?: boolean;
};
export const TransactionsList: React.FC<TransactionsListProps> = (props) => {
  const [displayLimit, setDisplayLimit] = useState(props.displayLimit || 10);

  if (!props.transactions?.length) {
    return <div>No transactions.</div>;
  }

  const displayTransactions = []
    .concat(props.transactions)
    .slice(0, displayLimit);
  return (
    <>
      <div className="flex-1 rounded border border-gray-200">
        <ul className="flex flex-col divide-y divide-gray-200">
          {displayTransactions.map((t) => (
            <TransactionsListItem
              key={t.id}
              categories={props.categories}
              banks={props.banks}
              currencies={props.currencies}
              transaction={t}
              onUpdated={props.onTransactionUpdated}
              showBankAccountInStatusLine={
                props.showBankAccountInStatusLine ?? true
              }
            />
          ))}
          <li className="bg-slate-50 p-2 text-center text-lg font-medium">
            Show
            <button
              onClick={() => setDisplayLimit(displayLimit + 10)}
              className=" ml-2 mr-1 text-indigo-600 hover:text-indigo-500"
            >
              10
            </button>
            <button
              onClick={() => setDisplayLimit(displayLimit + 100)}
              className=" ml-1 mr-2 text-indigo-600 hover:text-indigo-500"
            >
              100
            </button>
            more
          </li>
        </ul>
      </div>
    </>
  );
};
