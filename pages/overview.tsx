import Layout from "components/Layout";
import {
  isFullyConfigured,
  NotConfiguredYet,
} from "components/NotConfiguredYet";
import { TransactionsList } from "components/transactions/TransactionsList";
import { AddTransactionForm } from "components/txform/AddTransactionForm";
import { ButtonPagePrimary } from "components/ui/buttons";
import {
  AllDatabaseDataContextProvider,
  Amount,
  modelFromDatabaseData,
  useAllDatabaseDataContext,
} from "lib/ClientSideModel";
import { useDisplayCurrency } from "lib/displaySettings";
import { BankAccount } from "lib/model/BankAccount";
import { IOBBalancesByAccountId } from "lib/openbanking/interface";
import { allDbDataPropsWithOb } from "lib/ServerSideDB";
import { onTransactionChange } from "lib/stateHelpers";
import { TransactionAPIResponse } from "lib/transactionCreation";
import { InferGetServerSidePropsType } from "next";
import { createContext, useContext, useState } from "react";

const BankAccountListItem = (props: {
  account: BankAccount;
  onTransactionUpdated: (response: TransactionAPIResponse) => void;
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
      balanceText = (
        <>
          <span className="text-red-600">
            {props.account.balance().format()}
          </span>{" "}
          {delta.abs().format()} unaccounted{" "}
          {delta.lessThan(Amount.ZERO) ? "income" : "expense"}
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
        <span className="ml-2 text-sm font-light">{balanceText}</span>
      </div>
      {showTransactionList && (
        <div className="mt-4">
          <TransactionsList
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
  openBankingBalances: IOBBalancesByAccountId;
  onTransactionUpdated: (response: TransactionAPIResponse) => void;
}) => {
  const { banks } = useAllDatabaseDataContext();
  const displayCurrency = useDisplayCurrency();
  const showArchivedAccounts = useContext(ArchivedAccountsShownContext);
  return (
    <div className="flex-1 rounded border border-gray-200">
      <div className="flex flex-col divide-y divide-gray-200">
        {banks.map((bank) => (
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

export const getServerSideProps = allDbDataPropsWithOb;

export default function OverviewPage(
  dbData: InferGetServerSidePropsType<typeof getServerSideProps>
) {
  const [showAddTransactionForm, setShowAddTransactionForm] = useState(false);
  const [dbDataState, setDbData] = useState(dbData);
  const [archivedShown, setShowArchived] = useState(false);

  if (!isFullyConfigured(dbData)) {
    return <NotConfiguredYet />;
  }

  return (
    <Layout>
      <AllDatabaseDataContextProvider init={modelFromDatabaseData(dbDataState)}>
        <div className="mb-4">
          {!showAddTransactionForm && (
            <div className="flex justify-end">
              <ButtonPagePrimary
                onClick={() => setShowAddTransactionForm(true)}
              >
                New Transaction
              </ButtonPagePrimary>
            </div>
          )}
          {showAddTransactionForm && (
            <AddTransactionForm
              onAddedOrUpdated={onTransactionChange(setDbData)}
              openBankingTransactions={dbData.openBankingData.transactions}
              transactionPrototypes={dbData.dbTransactionPrototypes}
              onClose={() => setShowAddTransactionForm(false)}
            />
          )}
        </div>
        <div className="mb-4 flex justify-end">
          <ButtonPagePrimary onClick={() => setShowArchived(!archivedShown)}>
            {archivedShown ? "Hide archived" : "Show archived"}
          </ButtonPagePrimary>
        </div>
        <ArchivedAccountsShownContext.Provider value={archivedShown}>
          <BanksList
            onTransactionUpdated={onTransactionChange(setDbData)}
            openBankingBalances={dbData.openBankingData.balances}
          />
        </ArchivedAccountsShownContext.Provider>
      </AllDatabaseDataContextProvider>
    </Layout>
  );
}
