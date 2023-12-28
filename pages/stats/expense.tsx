import { DurationSelector, LAST_6_MONTHS } from "components/DurationSelector";
import { undoTailwindInputStyles } from "components/forms/Select";
import {
  isFullyConfigured,
  NotConfiguredYet,
} from "components/NotConfiguredYet";
import { DebugTable } from "components/stats/DebugTable";
import { StatsPageLayout } from "components/StatsPageLayout";
import { ButtonLink } from "components/ui/buttons";
import {
  eachMonthOfInterval,
  Interval,
  isWithinInterval,
  startOfMonth,
} from "date-fns";
import ReactEcharts from "echarts-for-react";
import { AmountWithCurrency } from "lib/AmountWithCurrency";
import {
  defaultChartOptions,
  legend,
  stackedBarChartTooltip,
} from "lib/charts";
import {
  AllDatabaseDataContextProvider,
  useAllDatabaseDataContext,
} from "lib/ClientSideModel";
import { useDisplayCurrency } from "lib/displaySettings";
import { Category } from "lib/model/Category";
import { Transaction } from "lib/model/Transaction";
import { allDbDataProps } from "lib/ServerSideDB";
import { InferGetServerSidePropsType } from "next";
import { useState } from "react";
import Select from "react-select";

export function ExpenseCharts(props: {
  transactions: Transaction[];
  duration: Interval;
}) {
  const [showDebugTable, setShowDebugTable] = useState(false);
  const displayCurrency = useDisplayCurrency();
  const { categories } = useAllDatabaseDataContext();
  const zero = AmountWithCurrency.zero(displayCurrency);
  const months = eachMonthOfInterval(props.duration).map((x) => x.getTime());
  const zeroes: [number, AmountWithCurrency][] = months.map((m) => [m, zero]);

  const transactions = props.transactions.filter(
    (t) => t.isPersonalExpense() || t.isThirdPartyExpense()
  );
  const moneyOut = new Map<number, AmountWithCurrency>(zeroes);
  const byRootCategoryIdAndMonth = new Map<
    number,
    Map<number, AmountWithCurrency>
  >();
  const byCategoryIdAndMonth = new Map<
    number,
    Map<number, AmountWithCurrency>
  >();
  for (const t of transactions) {
    const ts = startOfMonth(t.timestamp).getTime();
    const exchanged = t.amountOwnShare(displayCurrency);
    moneyOut.set(ts, exchanged.add(moneyOut.get(ts)));
    {
      const cid = t.category.id();
      const series = byCategoryIdAndMonth.get(cid) ?? new Map(zeroes);
      series.set(ts, exchanged.add(series.get(ts) ?? zero));
      byCategoryIdAndMonth.set(cid, series);
    }
    {
      const cid = t.category.root().id();
      const series = byRootCategoryIdAndMonth.get(cid) ?? new Map(zeroes);
      series.set(ts, exchanged.add(series.get(ts) ?? zero));
      byRootCategoryIdAndMonth.set(cid, series);
    }
  }

  return (
    <>
      <div className="m-4">
        {showDebugTable && (
          <>
            <ButtonLink onClick={() => setShowDebugTable(false)}>
              Hide debug table
            </ButtonLink>
            <h2 className="my-2 text-2xl font-medium leading-5">
              Income transactions
            </h2>
            <DebugTable transactions={transactions} />
            <ButtonLink onClick={() => setShowDebugTable(false)}>
              Hide debug table
            </ButtonLink>
          </>
        )}
        {!showDebugTable && (
          <ButtonLink onClick={() => setShowDebugTable(true)}>
            Show debug table
          </ButtonLink>
        )}
      </div>
      <ReactEcharts
        notMerge
        option={{
          ...defaultChartOptions(displayCurrency, months),
          ...legend(),
          title: {
            text: "Total money out",
          },
          series: [
            {
              type: "bar",
              name: "Money Out",
              data: months.map((m) => Math.round(moneyOut.get(m).dollar())),
              itemStyle: {
                color: "#15803d",
              },
            },
          ],
        }}
      />
      <ReactEcharts
        notMerge
        option={{
          ...defaultChartOptions(displayCurrency, months),
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
          ...defaultChartOptions(displayCurrency, months),
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
        transactions={props.transactions}
        duration={props.duration}
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
  const { categories } = useAllDatabaseDataContext();
  const transactions = props.transactions
    .filter((t) => t.isPersonalExpense() || t.isThirdPartyExpense())
    .filter((t) => t.category.childOf(props.category.id()));
  const zero = AmountWithCurrency.zero(displayCurrency);
  const months = eachMonthOfInterval(props.duration).map((x) => x.getTime());
  const zeroes: [number, AmountWithCurrency][] = months.map((m) => [m, zero]);

  let totalSum = zero;
  const byCategoryMonth = new Map<number, Map<number, AmountWithCurrency>>();
  for (const t of transactions) {
    const ts = startOfMonth(t.timestamp).getTime();
    const current = t.amountOwnShare(displayCurrency);
    const cid = t.category.id();
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
          ...defaultChartOptions(displayCurrency, months),
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
      isWithinInterval(t.timestamp, duration) &&
      !excludeCategories.some(
        (cid) => t.category.id() == cid || t.category.childOf(cid)
      )
  );
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
      <ExpenseCharts transactions={filteredTransactions} duration={duration} />
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
