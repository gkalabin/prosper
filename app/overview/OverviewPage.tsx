"use client";
import {
  isFullyConfigured,
  NotConfiguredYet,
} from "components/NotConfiguredYet";
import { TransactionsList } from "components/transactions/TransactionsList";
import { AddTransactionForm } from "components/txform/AddTransactionForm";
import { AnchorLink, ButtonPagePrimary } from "components/ui/buttons";
import { differenceInDays } from "date-fns";
import { AmountWithCurrency } from "lib/AmountWithCurrency";
import { AmountWithUnit } from "lib/AmountWithUnit";
import {
  AllDatabaseDataContextProvider,
  StockAndCurrencyExchange,
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
import { Currency } from "lib/model/Currency";
import { Stock } from "lib/model/Stock";
import { Transaction } from "lib/model/transaction/Transaction";
import { Income } from "lib/model/transaction/Income";
import { Transfer } from "lib/model/transaction/Transfer";
import { PersonalExpense } from "lib/model/transaction/PersonalExpense";
import { isCurrency, isStock } from "lib/model/Unit";
import {
  useOpenBankingBalances,
  useOpenBankingExpirations,
  useOpenBankingTransactions,
} from "lib/openbanking/context";
import { onTransactionChange } from "lib/stateHelpers";
import { useState } from "react";

function accountBalance(
  account: BankAccount,
  allTransactions: Transaction[],
  stocks: Stock[],
): AmountWithUnit {
  let balance = account.initialBalanceCents;
  allTransactions.forEach((t) => {
    if (!transactionBelongsToAccount(t, account)) {
      return;
    }
    switch (t.kind) {
      case "PersonalExpense":
        balance = balance - t.amountCents;
        return;
      case "Income":
        balance = balance + t.amountCents;
        return;
      case "Transfer":
        if (t.fromAccountId == account.id) {
          balance = balance - t.sentAmountCents;
        } else if (t.toAccountId == account.id) {
          balance = balance + t.receivedAmountCents;
        }
        return;
    }
  });
  return new AmountWithUnit({
    amountCents: balance,
    unit: accountUnit(account, stocks),
  });
}

function transactionBelongsToAccount(
  t: Transaction,
  account: BankAccount,
): boolean {
  switch (t.kind) {
    case "ThirdPartyExpense":
      return false;
    case "PersonalExpense":
    case "Income":
      return t.accountId == account.id;
    case "Transfer":
      return t.fromAccountId == account.id || t.toAccountId == account.id;
    default:
      const _exhaustiveCheck: never = t;
      throw new Error(`Unknown transaction kind ${_exhaustiveCheck}`);
  }
}

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

const BanksList = ({ banks }: { banks: Bank[] }) => {
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
  const { expirations } = useOpenBankingExpirations();
  const expiration = expirations?.find((e) => e.bankId == bank.id)
    ?.expirationEpoch;
  const now = new Date();
  const expiresInDays = differenceInDays(expiration, now);
  const dayOrDays = Math.abs(expiresInDays) == 1 ? "day" : "days";
  const accounts = accountsForBank(bank, bankAccounts);
  return (
    <div className="rounded border">
      <div className="border-b bg-indigo-200 p-2">
        <div className="text-xl font-medium text-gray-900">
          {bank.name}
          <span className="ml-2">
            {accountsSum(
              accounts,
              displayCurrency,
              exchange,
              transactions,
              stocks,
            ).format()}
          </span>
        </div>
        {expiration && expiresInDays < 7 && (
          <div className="text-sm font-light text-gray-700">
            OpenBanking connection{" "}
            {(expiresInDays > 0 && (
              <>
                expires in {expiresInDays} {dayOrDays}
              </>
            )) || (
              <>
                has expired {-expiresInDays} {dayOrDays} ago
              </>
            )}
            .{" "}
            <AnchorLink href={`/api/open-banking/reconnect?bankId=${bank.id}`}>
              Reconnect
            </AnchorLink>
          </div>
        )}
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

function accountsSum(
  accounts: BankAccount[],
  targetCurrency: Currency,
  exchange: StockAndCurrencyExchange,
  allTransactions: Transaction[],
  stocks: Stock[],
): AmountWithCurrency {
  let sum = AmountWithCurrency.zero(targetCurrency);
  const now = new Date();
  accounts.forEach((x) => {
    const b = accountBalance(x, allTransactions, stocks);
    const unit = b.getUnit();
    if (isCurrency(unit)) {
      const delta = exchange.exchangeCurrency(
        new AmountWithCurrency({
          amountCents: b.cents(),
          currency: unit,
        }),
        targetCurrency,
        now,
      );
      sum = sum.add(delta);
      return;
    }
    if (isStock(unit)) {
      const sharesValue = exchange.exchangeStock(
        b.getAmount(),
        unit,
        targetCurrency,
        now,
      );
      const delta = exchange.exchangeCurrency(sharesValue, targetCurrency, now);
      sum = sum.add(delta);
      return;
    }
    throw new Error(`Unknown unit: ${unit} for ${x.id}`);
  });
  return sum;
}

function NonEmptyPageContent() {
  const [showAddTransactionForm, setShowAddTransactionForm] = useState(false);
  const displayCurrency = useDisplayCurrency();
  const { banks, bankAccounts, transactions, exchange, stocks, setDbData } =
    useAllDatabaseDataContext();

  const total = accountsSum(
    bankAccounts,
    displayCurrency,
    exchange,
    transactions,
    stocks,
  );
  const totalCash = accountsSum(
    bankAccounts.filter((a) => isCurrency(accountUnit(a, stocks))),
    displayCurrency,
    exchange,
    transactions,
    stocks,
  );
  const { isError: obBalancesError, isLoading: obBalancesLoading } =
    useOpenBankingBalances();
  // Just trigger the loading of transactions, so they are cached for later.
  useOpenBankingTransactions();
  return (
    <div className="space-y-4">
      <div className="rounded border">
        <h2 className="bg-indigo-300 p-2 text-2xl font-medium text-gray-900">
          Total {total.format()}
        </h2>
        <div className="grid grid-cols-2">
          <span className="pl-3 text-lg font-medium">Cash</span>{" "}
          {totalCash.format()}
          <span className="pl-3 text-lg font-medium">Equity</span>{" "}
          {total.subtract(totalCash).format()}
        </div>
      </div>
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
