import { Transaction as DBTransaction } from "@prisma/client";
import { Amount } from "components/Amount";
import Layout from "components/Layout";
import { AddTransactionForm } from "components/transactions/AddTransactionForm";
import { TransactionsList } from "components/transactions/TransactionsList";
import { withIronSessionSsr } from "iron-session/next";
import { modelFromDatabaseData } from "lib/ClientSideModel";
import {
  Bank,
  BankAccount,
  bankAccountBalance
} from "lib/model/BankAccount";
import { Category } from "lib/model/Category";
import { Currency } from "lib/model/Currency";
import { AllDatabaseData, loadAllDatabaseData } from "lib/ServerSideDB";
import { sessionOptions } from "lib/session";
import { InferGetServerSidePropsType } from "next";
import Router from "next/router";
import React, { useState } from "react";
import { User } from "./api/user";

type BankAccountListItemProps = {
  banks: Bank[];
  categories: Category[];
  currencies: Currency[];
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
            categories={props.categories}
            banks={props.banks}
            currencies={props.currencies}
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
  banks: Bank[];
  categories: Category[];
  currencies: Currency[];
  bank: Bank;
};
const BankListItem: React.FC<BankListItemProps> = (props) => {
  return (
    <div className="">
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
            <BankListItem
              key={b.id}
              categories={props.categories}
              banks={props.banks}
              currencies={props.currencies}
              bank={b}
            />
          ))}
        </div>
      </div>
    </>
  );
};

export const getServerSideProps = withIronSessionSsr<{
  user: User;
  dbData?: AllDatabaseData;
}>(async function ({ req, res }) {
  const user = req.session.user;

  if (user === undefined) {
    res.setHeader("location", "/login");
    res.statusCode = 302;
    res.end();
    return {
      props: {
        user: { isLoggedIn: false, login: "" } as User,
      },
    };
  }
  const allData = await loadAllDatabaseData();

  return {
    props: {
      user: req.session.user,
      dbData: JSON.parse(JSON.stringify(allData)),
    },
  };
}, sessionOptions);

export default function OverviewPageWrapper({
  user,
  dbData,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  if (!user?.isLoggedIn) {
    Router.push("/login");
    return <></>;
  }
  return <OverviewPage dbData={dbData} user={user} />;
}

function OverviewPage({
  dbData,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
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
          <BanksList
            banks={model.banks}
            categories={model.categories}
            currencies={model.currencies}
          />
        </div>
      </div>
    </Layout>
  );
}
