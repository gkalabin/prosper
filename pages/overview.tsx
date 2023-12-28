import { Transaction as DBTransaction } from "@prisma/client";
import { GetStaticProps } from "next";
import React, { useState } from "react";
import Layout from "../components/Layout";
import { AddTransactionForm } from "../components/transactions/AddTransactionForm";
import { modelFromDatabaseData } from "../lib/ClientSideModel";
import { Bank, BankAccount } from "../lib/model/BankAccount";
import { AllDatabaseData, loadAllDatabaseData } from "../lib/ServerSideDB";

export const getStaticProps: GetStaticProps = async () => {
  const allData = await loadAllDatabaseData();
  return {
    props: JSON.parse(JSON.stringify(allData)),
  };
};

type BankAccountListItemProps = {
  account: BankAccount;
};
const BankAccountListItem: React.FC<BankAccountListItemProps> = (props) => {
  return (
    <div className="py-2 pl-6 pr-2">
      <span className="text-base font-normal">{props.account.name}</span>
    </div>
  );
};

type BankListItemProps = {
  bank: Bank;
};
const BankListItem: React.FC<BankListItemProps> = (props) => {
  return (
    <div className="">
      <div className="border-b bg-green-100 p-2 text-xl font-medium text-gray-900">
        {props.bank.name}
      </div>

      <div className="divide-y divide-gray-200">
        {props.bank.accounts.map((a) => (
          <BankAccountListItem key={a.id} account={a} />
        ))}
      </div>
    </div>
  );
};

type TransactionsListProps = {
  banks: Bank[];
};
const BanksList: React.FC<TransactionsListProps> = (props) => {
  if (!props.banks?.length) {
    return <div>No banks.</div>;
  }
  return (
    <>
      <div className="flex-1 rounded border border-gray-200">
        <div className="flex flex-col divide-y divide-gray-200">
          {props.banks.map((b) => (
            <BankListItem key={b.id} bank={b} />
          ))}
        </div>
      </div>
    </>
  );
};

const OverviewPage: React.FC<AllDatabaseData> = (props) => {
  const [showAddTransactionForm, setShowAddTransactionForm] = useState(false);
  const [dbData, setDbData] = useState(props);
  const model = modelFromDatabaseData(dbData);
  const addTransaction = (added: DBTransaction) => {
    // TODO
    console.log(added);
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
          <BanksList banks={model.banks} />
        </div>
      </div>
    </Layout>
  );
};

export default OverviewPage;
