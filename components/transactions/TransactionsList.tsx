import React from "react";
import Transaction from "../../lib/model/Transaction";
import { TransactionsListItem } from "../../pages/transactions";

type TransactionsListProps = {
  transactions: Transaction[];
  onTransactionUpdated: (transaction: Transaction) => void;
};
export const TransactionsList: React.FC<TransactionsListProps> = (props) => {
  if (!props.transactions?.length) {
    return <div>No transactions.</div>;
  }
  return (
    <>
      {props.transactions.map((t) => (
        <TransactionsListItem
          key={t.id}
          transaction={t}
          onUpdated={props.onTransactionUpdated} />
      ))}
    </>
  );
};
