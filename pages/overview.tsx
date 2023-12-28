import { Transaction as DBTransaction } from "@prisma/client";
import { Amount } from "components/Amount";
import Layout from "components/Layout";
import {
  isFullyConfigured,
  NotConfiguredYet,
} from "components/NotConfiguredYet";
import { TransactionsList } from "components/transactions/TransactionsList";
import { AddTransactionForm } from "components/txform/AddTransactionForm";
import { ButtonPagePrimary } from "components/ui/buttons";
import {
  CurrencyContextProvider,
  modelFromDatabaseData,
} from "lib/ClientSideModel";
import { useDisplayCurrency } from "lib/displaySettings";
import { AllDatabaseData } from "lib/model/AllDatabaseDataModel";
import { Bank, BankAccount } from "lib/model/BankAccount";
import { Category } from "lib/model/Category";
import { IOpenBankingData } from "lib/openbanking/interface";
import { allDbDataPropsWithOb } from "lib/ServerSideDB";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import React, { createContext, useContext, useState } from "react";

type BankAccountListItemProps = {
  banks: Bank[];
  categories: Category[];
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
          amount={props.account.balance()}
          className="ml-2 text-sm font-light"
        />
      </div>
      {showTransactionList && (
        <div className="mt-4">
          <TransactionsList
            categories={props.categories}
            banks={props.banks}
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
  bank: Bank;
  onTransactionUpdated: (updated: DBTransaction) => void;
};
const BankListItem: React.FC<BankListItemProps> = (props) => {
  const displayCurrency = useDisplayCurrency();
  const showArchivedAccounts = useContext(ArchivedAccountsShownContext);
  let accounts = props.bank.accounts;
  if (!showArchivedAccounts) {
    accounts = accounts.filter((x) => !x.isArchived());
  }
  return (
    <div>
      <div className="border-b bg-indigo-200 p-2 text-xl font-medium text-gray-900">
        {props.bank.name}
        <Amount amount={props.bank.balance(displayCurrency)} className="ml-2" />
      </div>

      <div className="divide-y divide-gray-200">
        {accounts.map((a) => (
          <BankAccountListItem
            key={a.id}
            account={a}
            categories={props.categories}
            banks={props.banks}
            onTransactionUpdated={props.onTransactionUpdated}
          />
        ))}
      </div>
    </div>
  );
};

type TransactionsListProps = {
  categories: Category[];
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
            bank={b}
            onTransactionUpdated={props.onTransactionUpdated}
          />
        ))}
      </div>
    </div>
  );
};

const ArchivedAccountsShownContext = createContext<boolean>(false);

export const getServerSideProps: GetServerSideProps<
  AllDatabaseData & IOpenBankingData
> = allDbDataPropsWithOb;

export default function OverviewPage(
  dbData: InferGetServerSidePropsType<typeof getServerSideProps>
) {
  const [showAddTransactionForm, setShowAddTransactionForm] = useState(false);
  const [dbDataState, setDbData] = useState(dbData);
  const { categories, banks, transactions } =
    modelFromDatabaseData(dbDataState);
  const [archivedShown, setShowArchived] = useState(false);

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

  if (!isFullyConfigured(dbData)) {
    return <NotConfiguredYet />;
  }

  return (
    <Layout>
      <CurrencyContextProvider init={dbData.dbCurrencies}>
        <div className="mb-4">
          {!showAddTransactionForm && (
            <div className="flex justify-end">
              <ButtonPagePrimary
                onClick={() => setShowAddTransactionForm(true)}
                label="New Transaction"
              />
            </div>
          )}
          {showAddTransactionForm && (
            <AddTransactionForm
              categories={categories}
              banks={banks}
              allTransactions={transactions}
              onAdded={addTransaction}
              obTransactions={dbData.openBankingData.transactions}
              onClose={() => setShowAddTransactionForm(false)}
            />
          )}
        </div>
        <div className="flex justify-end">
          <ButtonPagePrimary
            className="mb-4"
            onClick={() => setShowArchived(!archivedShown)}
            label={archivedShown ? "Hide archived" : "Show archived"}
          />
        </div>
        <ArchivedAccountsShownContext.Provider value={archivedShown}>
          <BanksList
            banks={banks}
            categories={categories}
            onTransactionUpdated={updateTransaction}
          />
        </ArchivedAccountsShownContext.Provider>
      </CurrencyContextProvider>
    </Layout>
  );
}
