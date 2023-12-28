import { GetStaticProps } from "next";
import React, { useState } from "react";
import Layout from "../components/Layout";
import { AddTransactionForm } from "../components/transactions/AddTransactionForm";
import { TransactionsList } from "../components/transactions/TransactionsList";
import { makeTransactionInclude } from "../lib/db/transactionInclude";
import { Bank } from "../lib/model/BankAccount";
import { DbCategory, makeCategoryTree } from "../lib/model/Category";
import Currency from "../lib/model/Currency";
import {
  DbTransaction,
  makeTransactionsFromDBModel,
  Transaction,
} from "../lib/model/Transaction";
import prisma from "../lib/prisma";

export const getStaticProps: GetStaticProps = async () => {
  const transactions = await prisma.transaction.findMany({
    include: makeTransactionInclude(),
  });
  const dbTransactions = transactions.map((t) =>
    Object.assign({}, t, {
      timestamp: t.timestamp.getTime(),
    })
  );
  const categories = await prisma.category.findMany({});
  const currencies = await prisma.currency.findMany({});
  const banks = await prisma.bank.findMany({
    include: {
      accounts: {
        include: {
          bank: true,
          currency: true,
        },
      },
    },
  });
  const props = {
    banks,
    currencies,
    dbCategories: categories,
    dbTransactions,
  };

  return {
    props: JSON.parse(JSON.stringify(props)),
  };
};

type PageProps = {
  dbTransactions: DbTransaction[];
  dbCategories: DbCategory[];
  banks: Bank[];
  currencies: Currency[];
};
const TransactionsPage: React.FC<PageProps> = (props) => {
  const [showAddTransactionForm, setShowAddTransactionForm] = useState(false);
  const [dbTransactions, setDbTransactions] = useState(props.dbTransactions);
  const categories = makeCategoryTree(props.dbCategories);
  const transactions = makeTransactionsFromDBModel(
    dbTransactions,
    categories
  ).sort((a: Transaction, b: Transaction) => {
    return b.timestamp.getTime() - a.timestamp.getTime();
  });

  const addTransaction = (added: DbTransaction) => {
    setDbTransactions((old) => [...old, added]);
    setShowAddTransactionForm(false);
  };
  const updateTransaction = (updated: DbTransaction) => {
    setDbTransactions((old) =>
      old.map((t) => (t.id == updated.id ? updated : t))
    );
  };

  return (
    <Layout>
      <div className="flex justify-center">
        <div className="sm:w-2/3">
          {!showAddTransactionForm && (
            <div className="flex justify-end">
              <button
                className="mb-4 rounded-md bg-indigo-600 px-4 py-1.5 text-base font-medium leading-7 text-white shadow-sm hover:bg-indigo-700 hover:ring-indigo-700"
                onClick={() => setShowAddTransactionForm(true)}
              >
                New Transaction
              </button>
            </div>
          )}
          {showAddTransactionForm && (
            <div className="">
              <AddTransactionForm
                onAdded={addTransaction}
                categories={categories}
                banks={props.banks}
                currencies={props.currencies}
                onClose={() => setShowAddTransactionForm(false)}
              />
            </div>
          )}

          <TransactionsList
            transactions={transactions}
            onTransactionUpdated={updateTransaction}
          />
        </div>
      </div>
    </Layout>
  );
};

export default TransactionsPage;
