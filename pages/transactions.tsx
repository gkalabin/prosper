import { Transaction as DBTransaction } from "@prisma/client";
import Layout from "components/Layout";
import {
  isFullyConfigured,
  NotConfiguredYet,
} from "components/NotConfiguredYet";
import { TransactionsList } from "components/transactions/TransactionsList";
import { AddTransactionForm } from "components/txform/AddTransactionForm";
import {
  AllDatabaseDataContextProvider,
  modelFromDatabaseData,
} from "lib/ClientSideModel";
import { allDbDataProps } from "lib/ServerSideDB";
import { updateOrAppend } from "lib/stateHelpers";
import { InferGetServerSidePropsType } from "next";
import { useState } from "react";

export const getServerSideProps = allDbDataProps;

export default function TransactionsPage(
  dbData: InferGetServerSidePropsType<typeof getServerSideProps>
) {
  const [showAddTransactionForm, setShowAddTransactionForm] = useState(false);
  const [dbDataState, setDbData] = useState(dbData);
  const model = modelFromDatabaseData(dbDataState);
  const { transactions } = model;
  const personalTransactions = transactions.filter(
    (t) => !t.isThirdPartyExpense()
  );
  const [displayTransactions, setDisplayTransactions] =
    useState(personalTransactions);

  const updateTransactions = (x: DBTransaction) => {
    setDbData((old) => {
      return Object.assign({}, old, {
        dbTransactions: updateOrAppend(old.dbTransactions, x),
      });
    });
  };

  if (!isFullyConfigured(dbData)) {
    return <NotConfiguredYet />;
  }

  return (
    <Layout
      subheader={[
        {
          title: "Personal",
          onSelected: () => {
            setDisplayTransactions(personalTransactions);
          },
        },
        {
          title: "External",
          onSelected: () => {
            setDisplayTransactions(
              transactions.filter((x) => x.isThirdPartyExpense())
            );
          },
        },
        {
          title: "All",
          onSelected: () => {
            setDisplayTransactions(transactions);
          },
        },
      ]}
    >
      <AllDatabaseDataContextProvider init={model}>
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
              onAdded={updateTransactions}
              transactionPrototypes={dbData.dbTransactionPrototypes}
              onClose={() => setShowAddTransactionForm(false)}
            />
          </div>
        )}

        <TransactionsList
          transactions={displayTransactions}
          onTransactionUpdated={updateTransactions}
        />
      </AllDatabaseDataContextProvider>
    </Layout>
  );
}
