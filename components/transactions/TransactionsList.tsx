import { Transaction as DBTransaction } from "@prisma/client";
import { format, formatDistance, isAfter, subDays } from "date-fns";
import React, { useState } from "react";
import { BankAccount } from "../../lib/model/BankAccount";
import { Transaction, transactionSign } from "../../lib/model/Transaction";
import { currencyByTransaction } from "../../lib/Money";
import { Amount } from "../Amount";
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

const TransactionStatusLine = (props: {
  t: Transaction;
  showBankAccountInStatusLine: boolean;
}) => {
  if (props.t.personalExpense) {
    const maybeBankAccount = props.showBankAccountInStatusLine && (
      <BankAccountLabel account={props.t.personalExpense.account} />
    );
    return <>{maybeBankAccount}</>;
  }
  if (props.t.thirdPartyExpense) {
    return <>{props.t.thirdPartyExpense.payer}</>;
  }
  if (props.t.income) {
    const maybeBankAccount = props.showBankAccountInStatusLine && (
      <BankAccountLabel account={props.t.income.account} />
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

function shortRelativeDate(d: Date) {
  const today = new Date();
  const fourDaysAgo = subDays(today, 4);
  if (isAfter(d, fourDaysAgo)) {
    // 2 days ago
    return formatDistance(d, today, { includeSeconds: false, addSuffix: true });
  }
  // Nov 19
  return format(d, "MMM dd");
}

const TransactionTimestamp = (props: { t: Transaction }) => {
  const [showShort, setShowShort] = useState(true);
  // Mar 22, 21, 19:05 GMT+0
  const longFormat = format(props.t.timestamp, "MMM dd, yy, H:mm O");
  if (showShort) {
    return (
      <span onClick={() => setShowShort(false)} title={longFormat}>
        {shortRelativeDate(props.t.timestamp)}
      </span>
    );
  }
  return (
    <span onClick={() => setShowShort(true)}>
      {longFormat}
    </span>
  );
};

type TransactionsListItemProps = {
  transaction: Transaction;
  onUpdated: (transaction: DBTransaction) => void;
  showBankAccountInStatusLine: boolean;
};
export const TransactionsListItem: React.FC<TransactionsListItemProps> = (
  props
) => {
  const [showRawDetails, setShowRawDetails] = useState(false);
  const raw = ""; //JSON.stringify(props.transaction.category, null, 2);
  return (
    // TODO: add date and category
    <li className="flex flex-col gap-2 p-2">
      <div className="flex min-h-[theme('spacing[16]')] gap-2">
        <div className="min-w-[theme('spacing[20]')] flex-none whitespace-nowrap text-right text-lg font-medium text-gray-900">
          <Amount
            amountCents={props.transaction.amountCents}
            sign={transactionSign(props.transaction)}
            currency={currencyByTransaction(props.transaction)}
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

      <div>{showRawDetails && <pre className="text-xs">{raw}</pre>}</div>
    </li>
  );
};

type TransactionsListProps = {
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
        <ul role="list" className="flex flex-col divide-y divide-gray-200">
          {displayTransactions.map((t) => (
            <TransactionsListItem
              key={t.id}
              transaction={t}
              onUpdated={props.onTransactionUpdated}
              showBankAccountInStatusLine={
                props.showBankAccountInStatusLine ?? true
              }
            />
          ))}
        </ul>
      </div>

      <div>
        <button onClick={() => setDisplayLimit(displayLimit + 10)}>
          Show 10 more
        </button>
        <button onClick={() => setDisplayLimit(displayLimit + 100)}>
          Show 100 more
        </button>
      </div>
    </>
  );
};
