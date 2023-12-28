"use client";
import { CurrencyExchangeFailed } from "app/stats/CurrencyExchangeFailed";
import { ExcludedCategoriesSelector } from "app/stats/ExcludedCategoriesSelector";
import { categoryNameById, dollarsRounded } from "app/stats/modelHelpers";
import { DurationSelector, LAST_6_MONTHS } from "components/DurationSelector";
import {
  NotConfiguredYet,
  isFullyConfigured,
} from "components/NotConfiguredYet";
import { MonthlyOwnShare } from "components/charts/MonthlySum";
import { RunningAverageOwnShare } from "components/charts/RunningAverage";
import { YearlyOwnShare } from "components/charts/YearlySum";
import {
  Interval,
  differenceInYears,
  eachMonthOfInterval,
  startOfMonth,
} from "date-fns";
import ReactEcharts from "echarts-for-react";
import { AmountWithCurrency } from "lib/AmountWithCurrency";
import {
  defaultMonthlyMoneyChart,
  legend,
  stackedBarChartTooltip,
} from "lib/charts";
import {
  AllDatabaseDataContextProvider,
  useAllDatabaseDataContext,
} from "lib/context/AllDatabaseDataContext";
import {
  useDisplayCurrency,
  useDisplaySettingsContext,
} from "lib/context/DisplaySettingsContext";
import { AllDatabaseData } from "lib/model/AllDatabaseDataModel";
import { Category, transactionIsDescendant } from "lib/model/Category";
import {
  Expense,
  Transaction,
  isExpense,
  transactionCategory,
} from "lib/model/transaction/Transaction";
import { amountOwnShare } from "lib/model/transaction/amounts";
import { TransactionsStatsInput } from "lib/stats/TransactionsStatsInput";
import { useState } from "react";

export function ExpenseCharts({ input }: { input: TransactionsStatsInput }) {
  const displayCurrency = useDisplayCurrency();
  const { categories, bankAccounts, stocks, exchange } =
    useAllDatabaseDataContext();
  const zero = AmountWithCurrency.zero(displayCurrency);
  const months = input.months().map((x) => x.getTime());
  const zeroes: [number, AmountWithCurrency][] = months.map((m) => [m, zero]);
  const failedToExchange: Transaction[] = [];

  const byRootCategoryIdAndMonth = new Map<
    number,
    Map<number, AmountWithCurrency>
  >();
  const byCategoryIdAndMonth = new Map<
    number,
    Map<number, AmountWithCurrency>
  >();
  for (const t of input.expenses()) {
    const ts = startOfMonth(t.timestampEpoch).getTime();
    const exchanged = amountOwnShare(
      t,
      displayCurrency,
      bankAccounts,
      stocks,
      exchange,
    );
    if (!exchanged) {
      failedToExchange.push(t);
      continue;
    }
    {
      const cid = t.categoryId;
      const series = byCategoryIdAndMonth.get(cid) ?? new Map(zeroes);
      series.set(ts, exchanged.add(series.get(ts) ?? zero));
      byCategoryIdAndMonth.set(cid, series);
    }
    {
      const category = transactionCategory(t, categories);
      const cid = category.root().id();
      const series = byRootCategoryIdAndMonth.get(cid) ?? new Map(zeroes);
      series.set(ts, exchanged.add(series.get(ts) ?? zero));
      byRootCategoryIdAndMonth.set(cid, series);
    }
  }

  return (
    <>
      <CurrencyExchangeFailed failedTransactions={failedToExchange} />

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
      <ReactEcharts
        notMerge
        option={{
          ...defaultMonthlyMoneyChart(displayCurrency, input.interval()),
          ...stackedBarChartTooltip(displayCurrency),
          ...legend(),
          title: {
            text: "By top level category",
          },
          series: [...byRootCategoryIdAndMonth.entries()].map(
            ([categoryId, series]) => ({
              type: "bar",
              stack: "moneyIn",
              name: categoryNameById(categoryId, categories),
              data: months.map((m) => dollarsRounded(series.get(m))),
            }),
          ),
        }}
      />
      <ReactEcharts
        notMerge
        option={{
          ...defaultMonthlyMoneyChart(displayCurrency, input.interval()),
          ...stackedBarChartTooltip(displayCurrency),
          title: {
            text: "By bottom level category",
          },
          series: [...byCategoryIdAndMonth.entries()].map(
            ([categoryId, series]) => ({
              type: "bar",
              stack: "moneyIn",
              name: categoryNameById(categoryId, categories),
              data: months.map((m) => dollarsRounded(series.get(m))),
            }),
          ),
        }}
      />

      <ByCategoryCharts
        transactions={input.expenses()}
        duration={input.interval()}
      />
    </>
  );
}

export function ByCategoryCharts(props: {
  transactions: Transaction[];
  duration: Interval;
}) {
  const { categories } = useAllDatabaseDataContext();
  return (
    <>
      <h2 className="my-2 text-2xl font-medium leading-5">
        Drilldown by top-level categories
      </h2>
      {categories
        .filter((c) => c.isRoot())
        .map((c) => (
          <ExpenseByCategory
            key={c.id()}
            transactions={props.transactions}
            category={c}
            duration={props.duration}
          />
        ))}
    </>
  );
}

export function ExpenseByCategory(props: {
  transactions: Transaction[];
  category: Category;
  duration: Interval;
}) {
  const displayCurrency = useDisplayCurrency();
  const { categories, bankAccounts, stocks, exchange } =
    useAllDatabaseDataContext();
  const transactions = props.transactions
    .filter((t): t is Expense => isExpense(t))
    .filter((t) =>
      transactionCategory(t, categories).childOf(props.category.id()),
    );
  const zero = AmountWithCurrency.zero(displayCurrency);
  const months = eachMonthOfInterval(props.duration).map((x) => x.getTime());
  const zeroes: [number, AmountWithCurrency][] = months.map((m) => [m, zero]);

  let totalSum = zero;
  const failedToExchange: Transaction[] = [];
  const byCategoryMonth = new Map<number, Map<number, AmountWithCurrency>>();
  for (const t of transactions) {
    const ts = startOfMonth(t.timestampEpoch).getTime();
    const current = amountOwnShare(
      t,
      displayCurrency,
      bankAccounts,
      stocks,
      exchange,
    );
    if (!current) {
      failedToExchange.push(t);
      continue;
    }
    const cid = t.categoryId;
    const series = byCategoryMonth.get(cid) ?? new Map(zeroes);
    series.set(ts, current.add(series.get(ts) ?? zero));
    byCategoryMonth.set(cid, series);
    totalSum = totalSum.add(current);
  }

  if (totalSum.isZero()) {
    return <></>;
  }

  return (
    <>
      <CurrencyExchangeFailed failedTransactions={failedToExchange} />
      <ReactEcharts
        notMerge
        option={{
          ...defaultMonthlyMoneyChart(displayCurrency, props.duration),
          ...stackedBarChartTooltip(displayCurrency),
          title: {
            text: props.category.nameWithAncestors(),
          },
          series: [...byCategoryMonth.entries()].map(
            ([categoryId, series]) => ({
              type: "bar",
              stack: "moneyOut",
              name: categoryNameById(categoryId, categories),
              data: months.map((m) => dollarsRounded(series.get(m))),
            }),
          ),
        }}
      />
    </>
  );
}

function NonEmptyPageContent() {
  const [duration, setDuration] = useState(LAST_6_MONTHS);

  const { transactions, categories } = useAllDatabaseDataContext();
  const { displaySettings } = useDisplaySettingsContext();
  const [excludeCategories, setExcludeCategories] = useState(
    displaySettings.excludeCategoryIdsInStats(),
  );
  const filteredTransactions = transactions.filter(
    (t) =>
      !excludeCategories.some((cid) =>
        transactionIsDescendant(t, cid, categories),
      ),
  );
  const input = new TransactionsStatsInput(filteredTransactions, duration);
  return (
    <div className="space-y-4">
      <div className="w-full max-w-sm">
        <DurationSelector duration={duration} onChange={setDuration} />
      </div>
      <ExcludedCategoriesSelector
        excludedIds={excludeCategories}
        setExcludedIds={setExcludeCategories}
      />
      <ExpenseCharts input={input} />
    </div>
  );
}

export function ExpensePage({ dbData }: { dbData: AllDatabaseData }) {
  if (!isFullyConfigured(dbData)) {
    return <NotConfiguredYet />;
  }
  return (
    <AllDatabaseDataContextProvider dbData={dbData}>
      <NonEmptyPageContent />
    </AllDatabaseDataContextProvider>
  );
}
