'use client';
import {CurrencyExchangeFailed} from 'app/stats/CurrencyExchangeFailed';
import {ExcludedCategoriesSelector} from 'app/stats/ExcludedCategoriesSelector';
import {ExpensesByChildCategory} from 'app/stats/expense/ByChildCategory';
import {ExpensesByRootCategory} from 'app/stats/expense/ByRootCategory';
import {
  categoryNameById,
  dollarsRounded,
  filterExcludedTransactions,
} from 'app/stats/modelHelpers';
import {DurationSelector, LAST_6_MONTHS} from 'components/DurationSelector';
import {NotConfiguredYet, isFullyConfigured} from 'components/NotConfiguredYet';
import {MonthlyOwnShare} from 'components/charts/MonthlySum';
import {RunningAverageOwnShare} from 'components/charts/RunningAverage';
import {YearlyOwnShare} from 'components/charts/YearlySum';
import {differenceInYears} from 'date-fns';
import ReactEcharts from 'echarts-for-react';
import {defaultMonthlyMoneyChart, stackedBarChartTooltip} from 'lib/charts';
import {
  AllDatabaseDataContextProvider,
  useAllDatabaseDataContext,
} from 'lib/context/AllDatabaseDataContext';
import {
  useDisplayCurrency,
  useDisplaySettingsContext,
} from 'lib/context/DisplaySettingsContext';
import {AllDatabaseData} from 'lib/model/AllDatabaseDataModel';
import {
  Category,
  isRoot,
  makeCategoryTree,
  subtreeIncludes,
} from 'lib/model/Category';
import {Transaction} from 'lib/model/transaction/Transaction';
import {amountAllParties, amountOwnShare} from 'lib/model/transaction/amounts';
import {
  DisplayCurrencyTransaction,
  TransactionsStatsInput,
} from 'lib/stats/TransactionsStatsInput';
import {DefaultMap} from 'lib/util/DefaultMap';
import {Granularity, MoneyTimeseries} from 'lib/util/Timeseries';
import {useState} from 'react';

function ByCategoryCharts({input}: {input: TransactionsStatsInput}) {
  const {categories} = useAllDatabaseDataContext();
  return (
    <>
      <h2 className="my-2 text-2xl font-medium leading-5">
        Drilldown by top-level categories
      </h2>
      {categories
        .filter(c => isRoot(c))
        .map(c => (
          <ExpenseByCategory key={c.id} root={c} input={input} />
        ))}
    </>
  );
}

function ExpenseByCategory({
  input,
  root,
}: {
  input: TransactionsStatsInput;
  root: Category;
}) {
  const displayCurrency = useDisplayCurrency();
  const {categories} = useAllDatabaseDataContext();
  const categoryTree = makeCategoryTree(categories);
  const newEmptySeries = () =>
    new MoneyTimeseries(displayCurrency, Granularity.MONTHLY);
  const data = new DefaultMap<number, MoneyTimeseries>(newEmptySeries);
  for (const {t, ownShare} of input.expensesExchanged()) {
    if (!subtreeIncludes(root, t.categoryId, categoryTree)) {
      continue;
    }
    data.getOrCreate(t.categoryId).increment(t.timestampEpoch, ownShare);
  }
  if (data.size == 0) {
    return <></>;
  }
  return (
    <>
      <ReactEcharts
        notMerge
        option={{
          ...defaultMonthlyMoneyChart(displayCurrency, input.interval()),
          ...stackedBarChartTooltip(displayCurrency),
          title: {
            text: categoryNameById(root.id, categories),
          },
          series: [...data.entries()].map(([categoryId, series]) => ({
            type: 'bar',
            stack: 'moneyOut',
            name: categoryNameById(categoryId, categories),
            data: input.months().map(m => dollarsRounded(series.get(m))),
          })),
        }}
      />
    </>
  );
}

function NonEmptyPageContent() {
  const [duration, setDuration] = useState(LAST_6_MONTHS);
  const {transactions, categories, bankAccounts, stocks, exchange} =
    useAllDatabaseDataContext();
  const displayCurrency = useDisplayCurrency();
  const {displaySettings} = useDisplaySettingsContext();
  const [excludeCategories, setExcludeCategories] = useState(
    displaySettings.excludeCategoryIdsInStats()
  );
  const filteredTransactions = filterExcludedTransactions(
    transactions,
    excludeCategories,
    categories
  );
  const failedToExchange: Transaction[] = [];
  const exchanged: DisplayCurrencyTransaction[] = [];
  for (const t of filteredTransactions) {
    if (t.kind == 'Transfer') {
      continue;
    }
    const own = amountOwnShare(
      t,
      displayCurrency,
      bankAccounts,
      stocks,
      exchange
    );
    if (!own) {
      failedToExchange.push(t);
      continue;
    }
    const all = amountAllParties(
      t,
      displayCurrency,
      bankAccounts,
      stocks,
      exchange
    );
    if (!all) {
      failedToExchange.push(t);
      continue;
    }
    exchanged.push({
      t,
      ownShare: own,
      allParties: all,
    });
  }
  const input = new TransactionsStatsInput(
    filteredTransactions,
    duration,
    exchanged
  );
  return (
    <div className="space-y-4">
      <div className="w-full max-w-sm">
        <DurationSelector duration={duration} onChange={setDuration} />
      </div>
      <ExcludedCategoriesSelector
        excludedIds={excludeCategories}
        setExcludedIds={setExcludeCategories}
        allCategories={categories}
      />
      <CurrencyExchangeFailed failedTransactions={failedToExchange} />
      {/* Charts with statistics begin below. */}
      <MonthlyOwnShare
        transactions={input.expenses()}
        duration={input.interval()}
        title="Monthly expense"
      />
      {differenceInYears(input.interval().end, input.interval().start) > 1 && (
        <YearlyOwnShare
          title="Yearly expense"
          transactions={input.expenses()}
          duration={input.interval()}
        />
      )}
      <RunningAverageOwnShare
        transactions={input.expensesAllTime()}
        duration={input.interval()}
        maxWindowLength={12}
        title="Average over previous 12 months"
      />
      <ExpensesByRootCategory input={input} />
      <ExpensesByChildCategory input={input} />
      <ByCategoryCharts input={input} />
    </div>
  );
}

export function ExpensePage({dbData}: {dbData: AllDatabaseData}) {
  if (!isFullyConfigured(dbData)) {
    return <NotConfiguredYet />;
  }
  return (
    <AllDatabaseDataContextProvider dbData={dbData}>
      <NonEmptyPageContent />
    </AllDatabaseDataContextProvider>
  );
}
