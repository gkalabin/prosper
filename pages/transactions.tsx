import React, { useState } from "react";
import prisma from "../lib/prisma";
import { GetStaticProps } from "next";
import Layout from "../components/Layout";
import Transaction from "../lib/model/Transaction";
import Bank from "../lib/model/Bank";
import Currency from "../lib/model/Currency";
import { DbCategory, makeCategoryTree } from "../lib/model/Category";
import { AddTransactionForm } from "../components/transactions/AddTransactionForm";
import { makeTransactionInclude } from "../lib/db/transactionInclude";

export const getStaticProps: GetStaticProps = async () => {
  const transactions = await prisma.transaction.findMany({
    include: makeTransactionInclude(),
  });
  const categories = await prisma.category.findMany({});
  const currencies = await prisma.currency.findMany({});
  const banks = await prisma.bank.findMany({
    include: {
      accounts: true,
    },
  });
  const props = {
    transactions,
    banks,
    currencies,
    dbCategories: categories,
  };

  return {
    props: JSON.parse(JSON.stringify(props)),
  };
};

type TransactionsListItemProps = {
  transaction: Transaction;
  onUpdated: (transaction: Transaction) => void;
};
const TransactionsListItem: React.FC<TransactionsListItemProps> = (props) => {
  const raw = JSON.stringify(props.transaction, null, 2);
  const [showRawDetails, setShowRawDetails] = useState(false);
  return (
    <div>
      {props.transaction.description}{" "}
      <a onClick={() => setShowRawDetails((prev) => !prev)}>
        {(showRawDetails && <>hide</>) || <>show</>} raw transaction
      </a>
      {showRawDetails && <pre>{raw}</pre>}
    </div>
  );
};

type TransactionsListProps = {
  transactions: Transaction[];
  onTransactionUpdated: (transaction: Transaction) => void;
};
const TransactionsList: React.FC<TransactionsListProps> = (props) => {
  if (!props.transactions?.length) {
    return <div>No transactions.</div>;
  }
  return (
    <>
      {props.transactions.map((t) => (
        <TransactionsListItem
          key={t.id}
          transaction={t}
          onUpdated={props.onTransactionUpdated}
        />
      ))}
    </>
  );
};

type PageProps = {
  transactions: Transaction[];
  dbCategories: DbCategory[];
  banks: Bank[];
  currencies: Currency[];
};
const TransactionsPage: React.FC<PageProps> = (props) => {
  const [transactionsUnordered, setTransactionsUnordered] = useState(
    props.transactions
  );
  const transactions = [].concat(transactionsUnordered);

  const addTransaction = (added: Transaction) => {
    setTransactionsUnordered((old) => [...old, added]);
  };
  const updateTransaction = (updated: Transaction) => {
    setTransactionsUnordered((old) =>
      old.map((t) => (t.id == updated.id ? updated : t))
    );
  };

  return (
    <Layout>
      <AddTransactionForm
        onAdded={addTransaction}
        categories={makeCategoryTree(props.dbCategories)}
        banks={props.banks}
        currencies={props.currencies}
      />
      <TransactionsList
        transactions={transactions}
        onTransactionUpdated={updateTransaction}
      />
    </Layout>
  );
};

export default TransactionsPage;
