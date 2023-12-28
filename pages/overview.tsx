import Layout from "components/Layout";
import {
  isFullyConfigured,
  NotConfiguredYet,
} from "components/NotConfiguredYet";
import { TransactionsList } from "components/transactions/TransactionsList";
import { AddTransactionForm } from "components/txform/AddTransactionForm";
import { ButtonPagePrimary } from "components/ui/buttons";
import { Amount } from "lib/Amount";
import { AmountWithCurrency } from "lib/AmountWithCurrency";
import {
  AllDatabaseDataContextProvider,
  useAllDatabaseDataContext,
} from "lib/ClientSideModel";
import { useDisplayCurrency } from "lib/displaySettings";
import { BankAccount } from "lib/model/BankAccount";
import {
  OpenBankingDataContextProvider,
  useOpenBankingDataContext,
} from "lib/openbanking/context";
import { allDbDataPropsWithOb } from "lib/ServerSideDB";
import { onTransactionChange } from "lib/stateHelpers";
import { TransactionAPIResponse } from "lib/transactionCreation";
import { InferGetServerSidePropsType } from "next";
import { useState } from "react";

const BankAccountListItem = (props: {
  account: BankAccount;
  onTransactionUpdated: (response: TransactionAPIResponse) => void;
}) => {
  const [showTransactionList, setShowTransactionList] = useState(false);

  let balanceText = <span>{props.account.balance().format()}</span>;
  const { balances: openBankingBalances } = useOpenBankingDataContext();
  if (openBankingBalances && openBankingBalances[props.account.id]) {
    const delta = props.account
      .balance()
      .getAmountWithoutCurrency()
      .subtract(openBankingBalances[props.account.id]);
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
  onTransactionUpdated: (response: TransactionAPIResponse) => void;
}) => {
  const { banks } = useAllDatabaseDataContext();
  const displayCurrency = useDisplayCurrency();
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
                .filter((a) => !a.isArchived())
                .map((account) => (
                  <BankAccountListItem
                    key={account.id}
                    account={account}
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

function OverviewPageContent() {
  const [showAddTransactionForm, setShowAddTransactionForm] = useState(false);
  const displayCurrency = useDisplayCurrency();
  const { banks, exchange, setDbData } = useAllDatabaseDataContext();

  const accounts = banks.flatMap((b) => b.accounts);
  const now = new Date();
  const zero = new AmountWithCurrency({
    amountCents: 0,
    currency: displayCurrency,
  });
  const total = accounts.reduce(
    (acc, account) =>
      acc.add(exchange.exchange(account.balance(), displayCurrency, now)),
    zero
  );
  const totalLiquid = accounts
    .filter((a) => a.isLiquid())
    .reduce(
      (acc, account) =>
        acc.add(exchange.exchange(account.balance(), displayCurrency, now)),
      zero
    );
  return (
    <Layout>
      <div className="mb-4">
        {!showAddTransactionForm && (
          <div className="flex justify-end">
            <ButtonPagePrimary onClick={() => setShowAddTransactionForm(true)}>
              New Transaction
            </ButtonPagePrimary>
          </div>
        )}
        {showAddTransactionForm && (
          <AddTransactionForm
            onAddedOrUpdated={onTransactionChange(setDbData)}
            onClose={() => setShowAddTransactionForm(false)}
          />
        )}
      </div>
      <div>
        <h2 className="text-2xl font-medium text-gray-900">Summary</h2>
        <div>Total: {total.format()}</div>
        <div>Liquid: {totalLiquid.format()}</div>
      </div>
      <BanksList onTransactionUpdated={onTransactionChange(setDbData)} />
    </Layout>
  );
}

export const getServerSideProps = allDbDataPropsWithOb;
export default function OverviewPage(
  dbData: InferGetServerSidePropsType<typeof getServerSideProps>
) {
  if (!isFullyConfigured(dbData)) {
    return <NotConfiguredYet />;
  }
  return (
    <OpenBankingDataContextProvider data={dbData.openBankingData}>
      <AllDatabaseDataContextProvider dbData={dbData}>
        <OverviewPageContent />
      </AllDatabaseDataContextProvider>
    </OpenBankingDataContextProvider>
  );
}
