import { Transaction as DBTransaction } from "@prisma/client";
import { GetStaticProps } from "next";
import React, { useState } from "react";
import { Amount } from "../components/Amount";
import Layout from "../components/Layout";
import { AddTransactionForm } from "../components/transactions/AddTransactionForm";
import { TransactionsList } from "../components/transactions/TransactionsList";
import { modelFromDatabaseData } from "../lib/ClientSideModel";
import {
  Bank,
  BankAccount,
  bankAccountBalance,
} from "../lib/model/BankAccount";
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
  const [showTransactionList, setShowTransactionList] = useState(false);
  return (
    <div className="flex flex-col py-2 pl-6 pr-2">
      <div onClick={() => setShowTransactionList(!showTransactionList)}>
        <span className="text-base font-normal">{props.account.name}</span>
        <Amount
          amountCents={bankAccountBalance(props.account)}
          sign={0}
          currency={props.account.currency}
          className="ml-2 text-sm font-light"
        />
      </div>
      {showTransactionList && (
        <div className="mt-4">
          <TransactionsList
            transactions={props.account.transactions}
            // TODO: implement
            onTransactionUpdated={() => alert("TODO")}
            showBankAccountInStatusLine={false}
          />
        </div>
      )}
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
                categories={model.categories}
                banks={model.banks}
                currencies={model.currencies}
                onAdded={addTransaction}
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
