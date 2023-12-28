import { RunningAverageOwnShare } from "components/charts/RunningAverage";
import { DurationSelector, LAST_6_MONTHS } from "components/DurationSelector";
import { undoTailwindInputStyles } from "components/forms/Select";
import {
  isFullyConfigured,
  NotConfiguredYet,
} from "components/NotConfiguredYet";
import { StatsPageLayout } from "components/StatsPageLayout";
import { startOfMonth } from "date-fns";
import ReactEcharts from "echarts-for-react";
import { AmountWithCurrency } from "lib/AmountWithCurrency";
import { defaultMonthlyMoneyChart, legend } from "lib/charts";
import {
  AllDatabaseDataContextProvider,
  useAllDatabaseDataContext,
} from "lib/ClientSideModel";
import { useDisplayCurrency } from "lib/displaySettings";
import { allDbDataProps } from "lib/ServerSideDB";
import { TransactionsStatsInput } from "lib/stats/TransactionsStatsInput";
import { InferGetServerSidePropsType } from "next";
import { useState } from "react";
import Select from "react-select";

export function IncomeCharts({ input }: { input: TransactionsStatsInput }) {
  const displayCurrency = useDisplayCurrency();
  const { categories } = useAllDatabaseDataContext();
  const zero = AmountWithCurrency.zero(displayCurrency);
  const months = input.months().map((x) => x.getTime());
  const zeroes: [number, AmountWithCurrency][] = months.map((m) => [m, zero]);

  const moneyIn = new Map<number, AmountWithCurrency>(zeroes);
  const byCategoryIdAndMonth = new Map<
    number,
    Map<number, AmountWithCurrency>
  >();
  for (const t of input.income()) {
    const ts = startOfMonth(t.timestamp).getTime();
    const exchanged = t.amountOwnShare(displayCurrency);
    moneyIn.set(ts, exchanged.add(moneyIn.get(ts)));
    const categorySeries =
      byCategoryIdAndMonth.get(t.category.id()) ?? new Map(zeroes);
    categorySeries.set(ts, exchanged.add(categorySeries.get(ts)));
    byCategoryIdAndMonth.set(t.category.id(), categorySeries);
  }

  return (
    <>
      <ReactEcharts
        notMerge
        option={{
          ...defaultMonthlyMoneyChart(displayCurrency, input.interval()),
          ...legend(),
          title: {
            text: "Total money in",
          },
          series: [
            {
              type: "bar",
              name: "Money In",
              data: months.map((m) => Math.round(moneyIn.get(m).dollar())),
              itemStyle: {
                color: "#15803d",
              },
            },
          ],
        }}
      />
      <RunningAverageOwnShare
        transactions={input.incomeAllTime()}
        duration={input.interval()}
        maxWindowLength={12}
        title="Average income (over previous 12 months)"
      />
      <ReactEcharts
        notMerge
        option={{
          ...defaultMonthlyMoneyChart(displayCurrency, input.interval()),
          ...legend(),
          title: {
            text: "By category",
          },
          series: [...byCategoryIdAndMonth.entries()].map(
            ([categoryId, series]) => ({
              type: "bar",
              stack: "moneyIn",
              name: categories.find((c) => c.id() === categoryId).name(),
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
    (t) => !excludeCategories.includes(t.category.id())
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
          instanceId={"categoryIds"}
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
      <IncomeCharts input={input} />
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
