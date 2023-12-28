"use client";
import { CurrencyExchangeFailed } from "app/stats/CurrencyExchangeFailed";
import { ExcludedCategoriesSelector } from "app/stats/ExcludedCategoriesSelector";
import { ownShareSum } from "app/stats/modelHelpers";
import {
  NotConfiguredYet,
  isFullyConfigured,
} from "components/NotConfiguredYet";
import {
  ChildCategoryOwnShareChart,
  TopLevelCategoryOwnShareChart,
} from "components/charts/CategoryPie";
import {
  TopNVendorsMostSpent,
  TopNVendorsMostTransactions,
} from "components/charts/Vendor";
import {
  SortableTransactionsList,
  SortingMode,
} from "components/transactions/SortableTransactionsList";
import { ButtonLink } from "components/ui/buttons";
import { format, isSameYear } from "date-fns";
import {
  AllDatabaseDataContextProvider,
  useAllDatabaseDataContext,
} from "lib/ClientSideModel";
import { useDisplayCurrency } from "lib/displaySettings";
import { AllDatabaseData } from "lib/model/AllDatabaseDataModel";
import { transactionIsDescendant } from "lib/model/Category";
import { Income } from "lib/model/transaction/Income";
import {
  Expense,
  Transaction,
  isExpense,
  isIncome,
} from "lib/model/transaction/Transaction";
import { TransactionsStatsInput } from "lib/stats/TransactionsStatsInput";
import { useState } from "react";

function Navigation({
  years,
  active,
  setActive,
}: {
  years: Date[];
  active: Date;
  setActive: (d: Date) => void;
}) {
  return (
    <>
      <div className="space-x-2">
        {years.map((y) => (
          <span key={y.getTime()}>
            {(isSameYear(active, y) && (
              <span className="font-medium text-slate-700">
                {format(y, "yyyy")}
              </span>
            )) || (
              <ButtonLink onClick={() => setActive(y)}>
                {format(y, "yyyy")}
              </ButtonLink>
            )}
          </span>
        ))}
      </div>
    </>
  );
}

export function VendorStats({
  input,
  year,
}: {
  input: TransactionsStatsInput;
  year: Date;
}) {
  const transactions = input
    .transactionsAllTime()
    .filter((t) => isSameYear(year, t.timestampEpoch));
  const expenses = transactions.filter((t): t is Expense => isExpense(t));
  return (
    <div>
      <h1 className="text-xl font-medium leading-7">Vendors</h1>
      <TopNVendorsMostSpent transactions={expenses} title="Most spent" n={10} />
      <TopNVendorsMostTransactions
        transactions={expenses}
        title="Most transactions"
        n={10}
      />
    </div>
  );
}

export function YearlyStats({ input }: { input: TransactionsStatsInput }) {
  const years = input.years();
  const [year, setYear] = useState(years[years.length - 1]);
  const transactions = input
    .transactionsAllTime()
    .filter((t) => isSameYear(year, t.timestampEpoch));
  const expenses = transactions.filter((t): t is Expense => isExpense(t));
  const income = transactions.filter((t): t is Income => isIncome(t));
  const displayCurrency = useDisplayCurrency();
  const { bankAccounts, stocks, exchange } = useAllDatabaseDataContext();
  const failedToExchange: Transaction[] = [];
  const totalExpense = ownShareSum(
    expenses,
    failedToExchange,
    displayCurrency,
    bankAccounts,
    stocks,
    exchange,
  );
  const totalIncome = ownShareSum(
    income,
    failedToExchange,
    displayCurrency,
    bankAccounts,
    stocks,
    exchange,
  );
  const expenseIncomeRatio = totalIncome.isZero()
    ? Infinity
    : totalExpense.dollar() / totalIncome.dollar();
  const totalTrips = ownShareSum(
    expenses.filter((t) => t.tripId),
    failedToExchange,
    displayCurrency,
    bankAccounts,
    stocks,
    exchange,
  );

  return (
    <>
      <div>
        <div className="my-3">
          <Navigation years={years} active={year} setActive={setYear} />
        </div>
        <div className="space-y-4">
          <CurrencyExchangeFailed failedTransactions={failedToExchange} />

          <ul className="text-lg">
            <li>Spent: {totalExpense.round().format()}</li>
            <li>Received: {totalIncome.round().format()}</li>
            <li>
              Delta: {totalIncome.subtract(totalExpense).round().format()}
            </li>
            <li>Spent/received: {Math.round(expenseIncomeRatio * 100)}%</li>
            <li>Trips: {totalTrips.round().format()}</li>
          </ul>

          <div>
            <h1 className="text-xl font-medium leading-7">
              Expenses ({expenses.length})
            </h1>
            <TopLevelCategoryOwnShareChart
              title="Top level category"
              transactions={expenses}
            />
            <ChildCategoryOwnShareChart
              title="Transaction category"
              transactions={expenses}
            />
            <SortableTransactionsList
              transactions={expenses}
              initialSorting={SortingMode.AMOUNT_DESC}
            />
          </div>

          <div>
            <h1 className="text-xl font-medium leading-7">
              Income ({income.length})
            </h1>
            <ChildCategoryOwnShareChart
              title="Income category"
              transactions={income}
            />
            <SortableTransactionsList
              transactions={income}
              initialSorting={SortingMode.AMOUNT_DESC}
            />
          </div>

          <div>
            <VendorStats input={input} year={year} />
          </div>
        </div>
      </div>
    </>
  );
}

function NonEmptyPageContent() {
  const { transactions, categories, displaySettings } =
    useAllDatabaseDataContext();
  const [excludeCategories, setExcludeCategories] = useState(
    displaySettings.excludeCategoryIdsInStats(),
  );
  const filteredTransactions = transactions.filter(
    (t) =>
      !excludeCategories.some((cid) =>
        transactionIsDescendant(t, cid, categories),
      ),
  );
  const durations = transactions
    .map((t) => t.timestampEpoch)
    .sort((a, b) => a - b);
  const input = new TransactionsStatsInput(filteredTransactions, {
    start: durations[0],
    end: durations[durations.length - 1],
  });
  return (
    <div className="space-y-4">
      <ExcludedCategoriesSelector
        excludedIds={excludeCategories}
        setExcludedIds={setExcludeCategories}
      />
      <YearlyStats input={input} />
    </div>
  );
}

export function YearlyStatsPage({ dbData }: { dbData: AllDatabaseData }) {
  if (!isFullyConfigured(dbData)) {
    return <NotConfiguredYet />;
  }
  return (
    <AllDatabaseDataContextProvider dbData={dbData}>
      <NonEmptyPageContent />
    </AllDatabaseDataContextProvider>
  );
}
