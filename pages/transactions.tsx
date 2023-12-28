import { GetStaticProps } from "next";
import React, { useState } from "react";
import Layout from "../components/Layout";
import { AddTransactionForm } from "../components/transactions/AddTransactionForm";
import { TransactionsList } from "../components/transactions/TransactionsList";
import { makeTransactionInclude } from "../lib/db/transactionInclude";
import Bank from "../lib/model/Bank";
import { DbCategory, makeCategoryTree } from "../lib/model/Category";
import Currency from "../lib/model/Currency";
import Transaction from "../lib/model/Transaction";
import prisma from "../lib/prisma";

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
export const TransactionsListItem: React.FC<TransactionsListItemProps> = (
  props
) => {
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
  const [displayLimit, setDisplayLimit] = useState(10);
  const transactions = [].concat(transactionsUnordered).slice(0, displayLimit);

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
      <button onClick={() => setDisplayLimit(displayLimit + 10)}>Show 10 more</button>
    </Layout>
  );
};

export default TransactionsPage;
