import { Transaction as DBTransaction } from "@prisma/client";
import { GetStaticProps } from "next";
import React, { useState } from "react";
import Layout from "../components/Layout";
import { AddTransactionForm } from "../components/transactions/AddTransactionForm";
import { TransactionsList } from "../components/transactions/TransactionsList";
import { modelFromDatabaseData } from "../lib/ClientSideModel";
import { AllDatabaseData, loadAllDatabaseData } from "../lib/ServerSideDB";

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
    console.log(added);
    // setDbData((old) => [...old, added]);
    setShowAddTransactionForm(false);
  };
  const updateTransaction = (updated: DBTransaction) => {
    // setDbTransactions((old) =>
    //   old.map((t) => (t.id == updated.id ? updated : t))
    // );
    console.log(updated);
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
                categories={model.categories}
                banks={model.banks}
                currencies={model.currencies}
                onClose={() => setShowAddTransactionForm(false)}
              />
            </div>
          )}

          <TransactionsList
            transactions={model.transactions}
            onTransactionUpdated={updateTransaction}
          />
        </div>
      </div>
    </Layout>
  );
};

export default TransactionsPage;
