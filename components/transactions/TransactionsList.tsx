import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import classNames from "classnames";
import { AddTransactionForm } from "components/txform/AddTransactionForm";
import { ButtonLink } from "components/ui/buttons";
import { format } from "date-fns";
import { useAllDatabaseDataContext } from "lib/ClientSideModel";
import { Transaction } from "lib/model/Transaction";
import { TransactionAPIResponse } from "lib/transactionDbUtils";
import { useState } from "react";

const TransactionTitle = ({ t }: { t: Transaction }) => {
  if (t.isTransfer()) {
    const from = t.accountFrom();
    const to = t.accountTo();
    let transferDetails = (
      <>
        {from.bank.name} {from.name} → {to.bank.name} {to.name}
      </>
    );
    if (from.bank.id == to.bank.id) {
      transferDetails = (
        <>
          {from.bank.name} {from.name} → {to.name}
        </>
      );
    }
    return <>{transferDetails}</>;
  }
  if (t.isPersonalExpense()) {
    return (
      <>
        {t.vendor()}{" "}
        {t.hasOtherParty() && <small>split with {t.otherParty()}</small>}
      </>
    );
  }
  if (t.isThirdPartyExpense()) {
    return (
      <>
        {t.vendor()} <small>paid by {t.payer()}</small>
      </>
    );
  }
  if (t.isIncome()) {
    return (
      <>
        {t.hasPayer() ? t.payer() : "Unknown payer"}{" "}
        {t.hasOtherParty() && <small>split with {t.otherParty()}</small>}
      </>
    );
  }
  throw new Error("Unknown transaction type");
};

export const TransactionsListItem = (props: {
  transaction: Transaction;
  onUpdated: (response: TransactionAPIResponse) => void;
  showBankAccountInStatusLine: boolean;
}) => {
  const [showRawDetails, setShowRawDetails] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const raw = JSON.stringify(props.transaction.dbValue, null, 2);
  const { tags } = useAllDatabaseDataContext();
  const t = props.transaction;
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
          <div className="text-xs italic text-gray-600">{t.description}</div>
          <div className="text-xs text-gray-600">
            {format(t.timestamp, "yyyy-MM-dd HH:mm")}
          </div>
        </div>
        <div
          className={classNames(
            "self-center pr-2 text-lg",
            t.isIncome() && "text-green-900"
          )}
        >
          {t.isIncome() ? "+" : ""}
          {t.amount().format()}
        </div>
        <div className="self-center">
          {!expanded && <ChevronRightIcon className="inline h-4 w-4" />}
          {expanded && <ChevronDownIcon className="inline h-4 w-4" />}
        </div>
      </div>

      {expanded && (
        <div className="pl-1">
          {/* TODO: do not show ID in the user interface */}
          <div>ID: {t.id}</div>
          <div>Time: {t.timestamp.toISOString()}</div>
          <div>Type: {t.type()}</div>
          <div>Category: {t.category.nameWithAncestors()}</div>
          {t.hasVendor() && <div>Vendor: {t.vendor()}</div>}
          {t.hasOtherParty() && <div>Other party: {t.otherParty()}</div>}
          {t.hasPayer() && <div>Payer: {t.payer()}</div>}
          {t.hasAccountFrom() && (
            <div>
              Account from: {t.accountFrom().bank.name} {t.accountFrom().name}
            </div>
          )}
          {t.hasAccountTo() && (
            <div>
              Account to: {t.accountTo().bank.name} {t.accountTo().name}
            </div>
          )}
          {(t.isPersonalExpense() ||
            t.isThirdPartyExpense() ||
            t.isIncome()) && <div>Full amount: {t.amount().format()}</div>}
          {(t.isPersonalExpense() ||
            t.isThirdPartyExpense() ||
            t.isIncome()) && (
            <div>Own share: {t.amountOwnShare().format()}</div>
          )}
          {t.isTransfer() && <div>Sent: {t.amount().format()}</div>}
          {t.isTransfer() && <div>Received: {t.amountReceived().format()}</div>}
          {!!t.tags().length && (
            <div>
              Tags:{" "}
              {t
                .tags()
                .map((t) => tags.find((x) => x.id() == t.id()).name())
                .join(", ")}
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
            {showRawDetails ? "Hide" : "Show"} raw details
          </ButtonLink>
        </div>
      )}

      {expanded && showRawDetails && <pre className="text-xs">{raw}</pre>}
      {expanded && showEditForm && (
        <div>
          <AddTransactionForm
            transaction={props.transaction}
            onAddedOrUpdated={(updated) => {
              props.onUpdated(updated);
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
  showBankAccountInStatusLine?: boolean;
}) => {
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
              className="ml-2 mr-1 text-indigo-600 hover:text-indigo-500"
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
