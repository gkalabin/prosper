import { Transaction as DBTransaction } from "@prisma/client";
import { Amount } from "components/Amount";
import Layout from "components/Layout";
import { AddTransactionForm } from "components/transactions/AddTransactionForm";
import { TransactionsList } from "components/transactions/TransactionsList";
import { modelFromDatabaseData } from "lib/ClientSideModel";
import { Bank, BankAccount, bankAccountBalance } from "lib/model/BankAccount";
import { Category } from "lib/model/Category";
import { Currency } from "lib/model/Currency";
import { AllDatabaseData, loadAllDatabaseData } from "lib/ServerSideDB";
import { GetStaticProps, InferGetStaticPropsType } from "next";
import React, { useState } from "react";

type BankAccountListItemProps = {
  banks: Bank[];
  categories: Category[];
  currencies: Currency[];
  account: BankAccount;
  onTransactionUpdated: (updated: DBTransaction) => void;
};
const BankAccountListItem: React.FC<BankAccountListItemProps> = (props) => {
  const [showTransactionList, setShowTransactionList] = useState(false);
  return (
    <div className="flex flex-col py-2 pl-6 pr-2">
      <div
        className="cursor-pointer"
        onClick={() => setShowTransactionList(!showTransactionList)}
      >
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
            categories={props.categories}
            banks={props.banks}
            currencies={props.currencies}
            transactions={props.account.transactions}
            onTransactionUpdated={props.onTransactionUpdated}
            showBankAccountInStatusLine={false}
          />
        </div>
      )}
    </div>
  );
};

type BankListItemProps = {
  banks: Bank[];
  categories: Category[];
  currencies: Currency[];
  bank: Bank;
  onTransactionUpdated: (updated: DBTransaction) => void;
};
const BankListItem: React.FC<BankListItemProps> = (props) => {
  return (
    <div>
      <div className="border-b bg-indigo-200 p-2 text-xl font-medium text-gray-900">
        {props.bank.name}
      </div>

      <div className="divide-y divide-gray-200">
        {props.bank.accounts.map((a) => (
          <BankAccountListItem
            key={a.id}
            account={a}
            categories={props.categories}
            banks={props.banks}
            currencies={props.currencies}
            onTransactionUpdated={props.onTransactionUpdated}
          />
        ))}
      </div>
    </div>
  );
};

type TransactionsListProps = {
  categories: Category[];
  currencies: Currency[];
  banks: Bank[];
  onTransactionUpdated: (updated: DBTransaction) => void;
};
const BanksList: React.FC<TransactionsListProps> = (props) => {
  if (!props.banks?.length) {
    return <div>No banks.</div>;
  }
  return (
    <div className="flex-1 rounded border border-gray-200">
      <div className="flex flex-col divide-y divide-gray-200">
        {props.banks.map((b) => (
          <BankListItem
            key={b.id}
            categories={props.categories}
            banks={props.banks}
            currencies={props.currencies}
            bank={b}
            onTransactionUpdated={props.onTransactionUpdated}
          />
        ))}
      </div>
    </div>
  );
};

export const getStaticProps: GetStaticProps<{
  dbData?: AllDatabaseData;
}> = async () => {
  const allData = await loadAllDatabaseData();
  return {
    props: {
      dbData: JSON.parse(JSON.stringify(allData)),
    },
  };
};

export default function OverviewPage({
  dbData,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const [showAddTransactionForm, setShowAddTransactionForm] = useState(false);
  const [dbDataState, setDbData] = useState(dbData);
  const model = modelFromDatabaseData(dbDataState);

  const addTransaction = (added: DBTransaction) => {
    setDbData((old) => {
      const newDataCopy = Object.assign({}, old);
      newDataCopy.dbTransactions = [...old.dbTransactions, added];
      return newDataCopy;
    });
    setShowAddTransactionForm(false);
  };
  const updateTransaction = (updated: DBTransaction) => {
    setDbData((oldDbData) => {
      const newDbData = Object.assign({}, oldDbData);
      newDbData.dbTransactions = oldDbData.dbTransactions.map((t) =>
        t.id == updated.id ? updated : t
      );
      return newDbData;
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
        <AddTransactionForm
          categories={model.categories}
          banks={model.banks}
          currencies={model.currencies}
          onAdded={addTransaction}
          onClose={() => setShowAddTransactionForm(false)}
        />
      )}
      <BanksList
        banks={model.banks}
        categories={model.categories}
        currencies={model.currencies}
        onTransactionUpdated={updateTransaction}
      />
    </Layout>
  );
}
