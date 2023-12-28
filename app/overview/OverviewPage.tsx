"use client";
import {
  isFullyConfigured,
  NotConfiguredYet,
} from "components/NotConfiguredYet";
import { TransactionsList } from "components/transactions/TransactionsList";
import { AddTransactionForm } from "components/txform/AddTransactionForm";
import { ButtonPagePrimary } from "components/ui/buttons";
import { AmountWithUnit } from "lib/AmountWithUnit";
import {
  AllDatabaseDataContextProvider,
  useAllDatabaseDataContext,
} from "lib/ClientSideModel";
import { useDisplayCurrency } from "lib/displaySettings";
import { AllDatabaseData } from "lib/model/AllDatabaseDataModel";
import {
  accountsForBank,
  accountUnit,
  Bank,
  BankAccount,
} from "lib/model/BankAccount";
import { Income } from "lib/model/transaction/Income";
import { PersonalExpense } from "lib/model/transaction/PersonalExpense";
import { Transfer } from "lib/model/transaction/Transfer";
import {
  useOpenBankingBalances,
  useOpenBankingTransactions,
} from "lib/openbanking/context";
import { onTransactionChange } from "lib/stateHelpers";
import { useState } from "react";
import {
  accountBalance,
  accountsSum,
  transactionBelongsToAccount,
} from "./modelHelpers";
import { OpenBankingConnectionExpirationWarning } from "./OpenBankingConnectionExpirationWarning";
import { StatsWidget } from "./StatsWidget";

const BankAccountListItem = ({ account }: { account: BankAccount }) => {
  const [showTransactionList, setShowTransactionList] = useState(false);
  const { setDbData, transactions, stocks } = useAllDatabaseDataContext();
  const appBalance = accountBalance(account, transactions, stocks);
  const unit = accountUnit(account, stocks);
  const accountTransactions = transactions.filter(
    (t): t is PersonalExpense | Transfer | Income =>
      transactionBelongsToAccount(t, account),
  );
  let balanceText = <span>{appBalance.format()}</span>;
  const { balances } = useOpenBankingBalances();
  const obBalance = balances?.find((b) => b.internalAccountId === account.id);
  if (obBalance) {
    const obAmount = new AmountWithUnit({
      amountCents: obBalance.balanceCents,
      unit,
    });
    const delta = appBalance.subtract(obAmount);
    if (delta.isZero()) {
      balanceText = (
        <span className="text-green-600">{appBalance.format()}</span>
      );
    } else {
      balanceText = (
        <>
          <span className="text-red-600">{appBalance.format()}</span>{" "}
          {delta.abs().format()} unaccounted{" "}
          {delta.isNegative() ? "income" : "expense"}
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
        <span className="text-base font-normal">{account.name}</span>
        <span className="ml-2 text-sm font-light">{balanceText}</span>
      </div>
      {showTransactionList && (
        <div className="mt-4">
          <TransactionsList
            transactions={accountTransactions}
            onTransactionUpdated={onTransactionChange(setDbData)}
            showBankAccountInStatusLine={false}
          />
        </div>
      )}
    </div>
  );
};

export const BanksList = ({ banks }: { banks: Bank[] }) => {
  return (
    <div className="space-y-4">
      {banks.map((bank) => (
        <BanksListItem key={bank.id} bank={bank} />
      ))}
    </div>
  );
};

const BanksListItem = ({ bank }: { bank: Bank }) => {
  const displayCurrency = useDisplayCurrency();
  const { exchange, stocks, transactions, bankAccounts } =
    useAllDatabaseDataContext();
  const accounts = accountsForBank(bank, bankAccounts);
  const bankTotal = accountsSum(
    accounts,
    displayCurrency,
    exchange,
    transactions,
    stocks,
  );
  return (
    <div className="rounded border">
      <div className="border-b bg-indigo-200 p-2">
        <div className="text-xl font-medium text-gray-900">
          {bank.name}
          {bankTotal && <span className="ml-2">{bankTotal.format()}</span>}
        </div>
        <OpenBankingConnectionExpirationWarning bank={bank} />
      </div>

      <div className="divide-y divide-gray-200">
        {accounts
          .filter((a) => !a.archived)
          .map((account) => (
            <BankAccountListItem key={account.id} account={account} />
          ))}
      </div>
    </div>
  );
};

function NonEmptyPageContent() {
  const [showAddTransactionForm, setShowAddTransactionForm] = useState(false);
  const { banks, setDbData } = useAllDatabaseDataContext();
  const { isError: obBalancesError, isLoading: obBalancesLoading } =
    useOpenBankingBalances();
  // Just trigger the loading of transactions, so they are cached for later.
  useOpenBankingTransactions();
  return (
    <div className="space-y-4">
      <StatsWidget />
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
            transaction={null}
            onAddedOrUpdated={onTransactionChange(setDbData)}
            onClose={() => setShowAddTransactionForm(false)}
          />
        )}
      </div>
      {obBalancesError && (
        <div className="rounded border bg-red-100 p-2 text-lg font-medium text-gray-900">
          Error loading Open Banking balances
        </div>
      )}
      {obBalancesLoading && (
        <div className="rounded border bg-yellow-50 p-2 text-base font-normal text-gray-900">
          Loading Open Banking balances...
        </div>
      )}
      <BanksList banks={banks} />
    </div>
  );
}

export function OverviewPage({ dbData }: { dbData: AllDatabaseData }) {
  if (!isFullyConfigured(dbData)) {
    return <NotConfiguredYet />;
  }
  return (
    <AllDatabaseDataContextProvider dbData={dbData}>
      <NonEmptyPageContent />
    </AllDatabaseDataContextProvider>
  );
}
