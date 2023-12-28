import React, { useState } from "react";
import prisma from "../lib/prisma";
import { GetStaticProps } from "next";
import Layout from "../components/Layout";
import Transaction from "../lib/model/Transaction";
import Bank from "../lib/model/Bank";
import { DbCategory, makeCategoryTree } from "../lib/model/Category";
import { AddTransactionForm } from "../components/AddTransactionForm";

export const getStaticProps: GetStaticProps = async () => {
  const transactions = await prisma.transaction.findMany({
    include: {
      category: true,
      personalExpense: {
        include: {
          account: true,
        },
      },
    },
  });
  const categories = await prisma.category.findMany({});
  const banks = await prisma.bank.findMany({
    include: {
      accounts: true,
    },
  });
  const props = {
    transactions,
    banks,
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
  return <div>{props.transaction.description}</div>;
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
      />
      <TransactionsList
        transactions={transactions}
        onTransactionUpdated={updateTransaction}
      />
    </Layout>
  );
};

export default TransactionsPage;
