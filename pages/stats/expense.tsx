import { MonthlyOwnShare } from "components/charts/MonthlySum";
import { RunningAverageOwnShare } from "components/charts/RunningAverage";
import { YearlyOwnShare } from "components/charts/YearlySum";
import { DurationSelector, LAST_6_MONTHS } from "components/DurationSelector";
import { undoTailwindInputStyles } from "components/forms/Select";
import {
  isFullyConfigured,
  NotConfiguredYet,
} from "components/NotConfiguredYet";
import { StatsPageLayout } from "components/StatsPageLayout";
import {
  differenceInYears,
  eachMonthOfInterval,
  Interval,
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
} from "lib/ClientSideModel";
import { useDisplayCurrency } from "lib/displaySettings";
import { Category, transactionIsDescendant } from "lib/model/Category";
import {
  amountOwnShare,
  Expense,
  isExpense,
  Transaction,
  transactionCategory,
} from "lib/model/Transaction";
import { allDbDataProps } from "lib/ServerSideDB";
import { TransactionsStatsInput } from "lib/stats/TransactionsStatsInput";
import { InferGetServerSidePropsType } from "next";
import { useState } from "react";
import Select from "react-select";

export function ExpenseCharts({ input }: { input: TransactionsStatsInput }) {
  const displayCurrency = useDisplayCurrency();
  const { categories, bankAccounts, stocks, exchange } =
    useAllDatabaseDataContext();
  const zero = AmountWithCurrency.zero(displayCurrency);
  const months = input.months().map((x) => x.getTime());
  const zeroes: [number, AmountWithCurrency][] = months.map((m) => [m, zero]);

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
      exchange
    );
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
              name: categories.find((c) => c.id() === categoryId).name(),
              data: months.map((m) => Math.round(series.get(m).dollar())),
            })
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
              name: categories
                .find((c) => c.id() === categoryId)
                .nameWithAncestors(),
              data: months.map((m) => Math.round(series.get(m).dollar())),
            })
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
      transactionCategory(t, categories).childOf(props.category.id())
    );
  const zero = AmountWithCurrency.zero(displayCurrency);
  const months = eachMonthOfInterval(props.duration).map((x) => x.getTime());
  const zeroes: [number, AmountWithCurrency][] = months.map((m) => [m, zero]);

  let totalSum = zero;
  const byCategoryMonth = new Map<number, Map<number, AmountWithCurrency>>();
  for (const t of transactions) {
    const ts = startOfMonth(t.timestampEpoch).getTime();
    const current = amountOwnShare(
      t,
      displayCurrency,
      bankAccounts,
      stocks,
      exchange
    );
    const cid = t.categoryId;
    const series = byCategoryMonth.get(cid) ?? new Map(zeroes);
    series.set(ts, current.add(series.get(ts)));
    byCategoryMonth.set(cid, series);
    totalSum = totalSum.add(current);
  }

  if (totalSum.isZero()) {
    return <></>;
  }

  return (
    <>
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
              name: categories
                .find((c) => c.id() === categoryId)
                .nameWithAncestors(),
              data: months.map((m) => Math.round(series.get(m).dollar())),
            })
          ),
        }}
      />
    </>
  );
}

function PageContent() {
  const [duration, setDuration] = useState(LAST_6_MONTHS);

  const { transactions, categories, displaySettings } =
    useAllDatabaseDataContext();
  const [excludeCategories, setExcludeCategories] = useState(
    displaySettings.excludeCategoryIdsInStats()
  );
  const categoryOptions = categories.map((a) => ({
    value: a.id(),
    label: a.nameWithAncestors(),
  }));
  const filteredTransactions = transactions.filter(
    (t) =>
      !excludeCategories.some((cid) =>
        transactionIsDescendant(t, cid, categories)
      )
  );
  const input = new TransactionsStatsInput(filteredTransactions, duration);
  return (
    <StatsPageLayout>
      <DurationSelector duration={duration} onChange={setDuration} />
      <div className="mb-4">
        <label
          htmlFor="categoryIds"
          className="block text-sm font-medium text-gray-700"
        >
          Categories to exclude
        </label>
        <Select
          instanceId="excludeCategories"
          styles={undoTailwindInputStyles()}
          options={categoryOptions}
          isMulti
          value={excludeCategories.map((x) => ({
            label: categoryOptions.find((c) => c.value == x).label,
            value: x,
          }))}
          onChange={(x) => setExcludeCategories(x.map((x) => x.value))}
        />
      </div>
      <ExpenseCharts input={input} />
    </StatsPageLayout>
  );
}

export const getServerSideProps = allDbDataProps;
export default function MaybeEmptyPage(
  dbData: InferGetServerSidePropsType<typeof getServerSideProps>
) {
  if (!isFullyConfigured(dbData)) {
    return <NotConfiguredYet />;
  }
  return (
    <AllDatabaseDataContextProvider dbData={dbData}>
      <PageContent />
    </AllDatabaseDataContextProvider>
  );
}
