'use client';
import {CurrencyExchangeFailed} from 'app/stats/CurrencyExchangeFailed';
import {ExcludedCategoriesSelector} from 'app/stats/ExcludedCategoriesSelector';
import {filterExcludedTransactions, ownShareSum} from 'app/stats/modelHelpers';
import {Navigation} from 'app/stats/quarterly/Navigation';
import {NotConfiguredYet, isFullyConfigured} from 'components/NotConfiguredYet';
import {
  ChildCategoryOwnShareChart,
  TopLevelCategoryOwnShareChart,
} from 'components/charts/CategoryPie';
import {
  TopNVendorsMostSpent,
  TopNVendorsMostTransactions,
} from 'components/charts/Vendor';
import {
  SortableTransactionsList,
  SortingMode,
} from 'components/transactions/SortableTransactionsList';
import {
  Interval,
  endOfMonth,
  isSameMonth,
  isWithinInterval,
  startOfMonth,
} from 'date-fns';
import {
  AllDatabaseDataContextProvider,
  useAllDatabaseDataContext,
} from 'lib/context/AllDatabaseDataContext';
import {
  useDisplayCurrency,
  useDisplaySettingsContext,
} from 'lib/context/DisplaySettingsContext';
import {AllDatabaseData} from 'lib/model/AllDatabaseDataModel';
import {Income} from 'lib/model/transaction/Income';
import {
  Expense,
  Transaction,
  isExpense,
  isIncome,
} from 'lib/model/transaction/Transaction';
import {TransactionsStatsInput} from 'lib/stats/TransactionsStatsInput';
import {Granularity} from 'lib/util/Granularity';
import {useState} from 'react';

export function MonthlyStats({input}: {input: TransactionsStatsInput}) {
  const timestamps = input
    .transactionsAllTime()
    .map(t => t.timestampEpoch)
    .sort((a, b) => a - b);
  const allDataInterval = {
    start: timestamps[0],
    end: timestamps[timestamps.length - 1],
  };
  const now = new Date();
  const [month, setMonth] = useState<Interval>({
    start: startOfMonth(now),
    end: endOfMonth(now),
  });
  const transactions = input
    .transactionsAllTime()
    .filter(t => isWithinInterval(t.timestampEpoch, month));
  const expenses = transactions.filter((t): t is Expense => isExpense(t));
  const income = transactions.filter((t): t is Income => isIncome(t));
  const displayCurrency = useDisplayCurrency();
  const {bankAccounts, stocks, exchange} = useAllDatabaseDataContext();
  const failedToExchange: Transaction[] = [];
  const totalExpense = ownShareSum(
    expenses,
    failedToExchange,
    displayCurrency,
    bankAccounts,
    stocks,
    exchange
  );
  const totalIncome = ownShareSum(
    income,
    failedToExchange,
    displayCurrency,
    bankAccounts,
    stocks,
    exchange
  );
  const expenseIncomeRatio = totalIncome.isZero()
    ? Infinity
    : totalExpense.dollar() / totalIncome.dollar();
  return (
    <>
      <div>
        <div className="my-3">
          <Navigation
            timeline={allDataInterval}
            granularity={Granularity.MONTHLY}
            selected={month}
            setSelected={setMonth}
          />
        </div>

        <CurrencyExchangeFailed failedTransactions={failedToExchange} />

        <div className="space-y-4">
          <ul className="text-lg">
            <li>Spent: {totalExpense.round().format()}</li>
            <li>Received: {totalIncome.round().format()}</li>
            <li>
              Delta: {totalIncome.subtract(totalExpense).round().format()}
            </li>
            <li>Spent/received: {Math.round(expenseIncomeRatio * 100)}%</li>
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
            <VendorStats input={input} month={new Date(month.start)} />
          </div>
        </div>
      </div>
    </>
  );
}

export function VendorStats({
  input,
  month,
}: {
  input: TransactionsStatsInput;
  month: Date;
}) {
  const transactions = input
    .transactionsAllTime()
    .filter(t => isSameMonth(month, t.timestampEpoch));
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

function NonEmptyPageContent() {
  const {transactions, categories} = useAllDatabaseDataContext();
  const {displaySettings} = useDisplaySettingsContext();
  const [excludeCategories, setExcludeCategories] = useState(
    displaySettings.excludeCategoryIdsInStats()
  );
  const filteredTransactions = filterExcludedTransactions(
    transactions,
    excludeCategories,
    categories
  );
  const durations = transactions
    .map(t => t.timestampEpoch)
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
      <MonthlyStats input={input} />
    </div>
  );
}

export function MonthlyStatsPage({dbData}: {dbData: AllDatabaseData}) {
  if (!isFullyConfigured(dbData)) {
    return <NotConfiguredYet />;
  }
  return (
    <AllDatabaseDataContextProvider dbData={dbData}>
      <NonEmptyPageContent />
    </AllDatabaseDataContextProvider>
  );
}
