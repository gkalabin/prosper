import { Transaction as DBTransaction } from "@prisma/client";
import Layout from "components/Layout";
import { AddTransactionForm } from "components/transactions/AddTransactionForm";
import { TransactionsList } from "components/transactions/TransactionsList";
import { modelFromDatabaseData } from "lib/ClientSideModel";
import { AllDatabaseData, loadAllDatabaseData } from "lib/ServerSideDB";
import { GetStaticProps } from "next";
import React, { useState } from "react";

export const getStaticProps: GetStaticProps = async () => {
  const allData = await loadAllDatabaseData();
  return {
    props: JSON.parse(JSON.stringify(allData)),
  };
};

const TransactionsPage: React.FC<AllDatabaseData> = (props) => {
  const [showAddTransactionForm, setShowAddTransactionForm] = useState(false);
  const [dbData, setDbData] = useState(props);
  const model = modelFromDatabaseData(dbData);

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

  return (
    <Layout>
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
            categories={model.categories}
            banks={model.banks}
            onClose={() => setShowAddTransactionForm(false)}
          />
        </div>
      )}

      <TransactionsList
        categories={model.categories}
        banks={model.banks}
        transactions={model.transactions}
        onTransactionUpdated={updateTransaction}
      />
    </Layout>
  );
};

export default TransactionsPage;
