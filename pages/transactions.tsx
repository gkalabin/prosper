import { Transaction as DBTransaction } from "@prisma/client";
import Layout from "components/Layout";
import {
  isFullyConfigured,
  NotConfiguredYet,
} from "components/NotConfiguredYet";
import { TransactionsList } from "components/transactions/TransactionsList";
import { AddTransactionForm } from "components/txform/AddTransactionForm";
import {
  CurrencyContextProvider,
  modelFromDatabaseData,
} from "lib/ClientSideModel";
import { AllDatabaseData } from "lib/model/AllDatabaseDataModel";
import { allDbDataProps } from "lib/ServerSideDB";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { useState } from "react";

export const getServerSideProps: GetServerSideProps<AllDatabaseData> =
  allDbDataProps;

export default function TransactionsPage(
  dbData: InferGetServerSidePropsType<typeof getServerSideProps>
) {
  const [showAddTransactionForm, setShowAddTransactionForm] = useState(false);
  const [dbDataState, setDbData] = useState(dbData);
  const { categories, banks, transactions } =
    modelFromDatabaseData(dbDataState);
  const personalTransactions = transactions.filter(
    (t) => !t.isThirdPartyExpense()
  );
  const [displayTransactions, setDisplayTransactions] =
    useState(personalTransactions);

  const addTransaction = (added: DBTransaction) => {
    setDbData((old) => {
      const newDataCopy = Object.assign({}, old);
      newDataCopy.dbTransactions = [...old.dbTransactions, added];
      return newDataCopy;
    });
    setShowAddTransactionForm(false);
  };
  const updateTransaction = (updated: DBTransaction) => {
    setDbData((old) => {
      const newDataCopy = Object.assign({}, old);
      newDataCopy.dbTransactions = old.dbTransactions.map((t) =>
        t.id == updated.id ? updated : t
      );
      return newDataCopy;
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
      <CurrencyContextProvider init={dbData.dbCurrencies}>
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
              banks={banks}
              onClose={() => setShowAddTransactionForm(false)}
            />
          </div>
        )}

        <TransactionsList
          categories={categories}
          banks={banks}
          transactions={displayTransactions}
          onTransactionUpdated={updateTransaction}
        />
      </CurrencyContextProvider>
    </Layout>
  );
}
