import { Transaction as DBTransaction } from "@prisma/client";
import Layout from "components/Layout";
import {
  isFullyConfigured,
  NotConfiguredYet,
} from "components/NotConfiguredYet";
import { TransactionsList } from "components/transactions/TransactionsList";
import { AddTransactionForm } from "components/txform/AddTransactionForm";
import { ButtonPagePrimary } from "components/ui/buttons";
import {
  Amount,
  CurrencyContextProvider,
  modelFromDatabaseData,
} from "lib/ClientSideModel";
import { useDisplayCurrency } from "lib/displaySettings";
import { AllDatabaseData } from "lib/model/AllDatabaseDataModel";
import { Bank, BankAccount } from "lib/model/BankAccount";
import { Category } from "lib/model/Category";
import {
  IOBBalancesByAccountId,
  IOpenBankingData,
} from "lib/openbanking/interface";
import { allDbDataPropsWithOb } from "lib/ServerSideDB";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import React, { createContext, useContext, useState } from "react";

const BankAccountListItem = (props: {
  banks: Bank[];
  categories: Category[];
  account: BankAccount;
  onTransactionUpdated: (updated: DBTransaction) => void;
  openBankingBalance?: Amount;
}) => {
  const [showTransactionList, setShowTransactionList] = useState(false);

  let balanceText = <span>{props.account.balance().format()}</span>;
  if (props.openBankingBalance) {
    const delta = props.account
      .balance()
      .getAmountWithoutCurrency()
      .subtract(props.openBankingBalance);
    if (delta.equals(Amount.ZERO)) {
      balanceText = (
        <span className="text-green-600">
          {props.account.balance().format()}
        </span>
      );
    } else {
      console.log("account", props.account.balance())
      console.log("ob", props.openBankingBalance)
      console.log("delta", delta)
      balanceText = (
        <>
          <span className="text-red-600">
            {props.account.balance().format()}
          </span>{" "}
          {delta.format()}{" "}
          {delta.lessThan(Amount.ZERO) ? "extra" : "unaccounted"}
        </>
      );
    }
  }

  return (
    <div className="flex flex-col py-2 pl-6 pr-2">
      <div
        className="cursor-pointer"
        onClick={() => setShowTransactionList(!showTransactionList)}
      >
        <span className="text-base font-normal">{props.account.name}</span>
        <span className="ml-2 text-sm font-light">
          {balanceText}
        </span>
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

const BanksList = (props: {
  categories: Category[];
  banks: Bank[];
  openBankingBalances: IOBBalancesByAccountId;
  onTransactionUpdated: (updated: DBTransaction) => void;
}) => {
  const displayCurrency = useDisplayCurrency();
  const showArchivedAccounts = useContext(ArchivedAccountsShownContext);
  return (
    <div className="flex-1 rounded border border-gray-200">
      <div className="flex flex-col divide-y divide-gray-200">
        {props.banks.map((bank) => (
          <div key={bank.id}>
            <div className="border-b bg-indigo-200 p-2 text-xl font-medium text-gray-900">
              {bank.name}
              <span className="ml-2">
                {bank.balance(displayCurrency).format()}
              </span>
            </div>

            <div className="divide-y divide-gray-200">
              {bank.accounts
                .filter((a) => showArchivedAccounts || !a.isArchived())
                .map((account) => (
                  <BankAccountListItem
                    key={account.id}
                    account={account}
                    categories={props.categories}
                    banks={props.banks}
                    openBankingBalance={props.openBankingBalances[account.id]}
                    onTransactionUpdated={props.onTransactionUpdated}
                  />
                ))}
            </div>
          </div>
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
            openBankingBalances={dbData.openBankingData.balances}
          />
        </ArchivedAccountsShownContext.Provider>
      </CurrencyContextProvider>
    </Layout>
  );
}
