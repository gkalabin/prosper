import { DurationSelector } from "components/DurationSelector";
import { undoTailwindInputStyles } from "components/forms/Select";
import {
  isFullyConfigured,
  NotConfiguredYet,
} from "components/NotConfiguredYet";
import { DebugTable } from "components/stats/DebugTable";
import { StatsPageLayout } from "components/StatsPageLayout";
import { ButtonLink } from "components/ui/buttons";
import { startOfMonth } from "date-fns";
import { EChartsOption } from "echarts";
import ReactEcharts from "echarts-for-react";
import { AmountWithCurrency } from "lib/AmountWithCurrency";
import {
  AllDatabaseDataContextProvider,
  useAllDatabaseDataContext,
} from "lib/ClientSideModel";
import { useDisplayCurrency } from "lib/displaySettings";
import { LAST_6_MONTHS } from "lib/Interval";
import { Transaction } from "lib/model/Transaction";
import { allDbDataProps } from "lib/ServerSideDB";
import { formatMonth } from "lib/TimeHelpers";
import { InferGetServerSidePropsType } from "next";
import { useState } from "react";
import Select from "react-select";

export function ExpenseCharts(props: { transactions: Transaction[] }) {
  const [showDebugTable, setShowDebugTable] = useState(false);
  const displayCurrency = useDisplayCurrency();
  const { categories } = useAllDatabaseDataContext();
  const zero = new AmountWithCurrency({
    amountCents: 0,
    currency: displayCurrency,
  });

  const transactions = props.transactions.filter(
    (t) => t.isPersonalExpense() || t.isThirdPartyExpense()
  );
  const moneyOut: { [firstOfMonthEpoch: number]: AmountWithCurrency } = {};
  const byRootCategoryIdAndMonth = new Map<
    number,
    Map<number, AmountWithCurrency>
  >();
  const byCategoryIdAndMonth = new Map<
    number,
    Map<number, AmountWithCurrency>
  >();
  const monthsIndex: { [firstOfMonthEpoch: number]: boolean } = {};
  for (const t of transactions) {
    const ts = startOfMonth(t.timestamp).getTime();
    monthsIndex[ts] = true;
    moneyOut[ts] ??= zero;
    const exchanged = t.amountOwnShare(displayCurrency);
    moneyOut[ts] = moneyOut[ts].add(exchanged);
    {
      const cid = t.category.id();
      const series = byCategoryIdAndMonth.get(cid) ?? new Map();
      series.set(ts, exchanged.add(series.get(ts) ?? zero));
      byCategoryIdAndMonth.set(cid, series);
    }
    {
      const cid = t.category.root().id();
      const series = byRootCategoryIdAndMonth.get(cid) ?? new Map();
      series.set(ts, exchanged.add(series.get(ts) ?? zero));
      byRootCategoryIdAndMonth.set(cid, series);
    }
  }

  const months = Object.keys(monthsIndex)
    .map((x) => +x)
    .sort();
  months.forEach((m) => {
    moneyOut[m] ??= zero;
    [...byCategoryIdAndMonth.values()].forEach((v) => {
      v.set(m, v.get(m) ?? zero);
    });
    [...byRootCategoryIdAndMonth.values()].forEach((v) => {
      v.set(m, v.get(m) ?? zero);
    });
  });

  const currencyFormatter = (value) =>
    displayCurrency.format(value, { maximumFractionDigits: 0 });
  const defaultChartOptions: EChartsOption = {
    grid: {
      containLabel: true,
    },
    tooltip: {},
    xAxis: {
      data: months.map((x) => formatMonth(x)),
    },
    yAxis: {
      axisLabel: {
        formatter: currencyFormatter,
      },
    },
  };

  const tooltipFormatterStackedBarChart = (params) => {
    if (params.length === 0) {
      return "No data";
    }
    const rows = params
      .filter((p) => p.value !== 0)
      .sort((a, b) => b.value - a.value)
      .map((p) => {
        return `
        <div class="flex gap-2">
          <div class="grow">
            ${p.marker} ${p.seriesName}
          </div>
          <div class="font-medium">
            ${currencyFormatter(p.value)}
          </div>
        </div>
        `;
      })
      .join("\n");
    const out = `
      <div>
        <span class="text-lg">
          ${params[0].axisValueLabel}
        </span>
        ${rows}
      </div>`;
    return out;
  };
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
          ...defaultChartOptions,
          title: {
            text: "Total money out",
          },
          legend: {
            orient: "horizontal",
            bottom: 10,
            top: "bottom",
          },
          series: [
            {
              type: "bar",
              name: "Money Out",
              data: months.map((m) => Math.round(moneyOut[m].dollar())),
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
          ...defaultChartOptions,
          title: {
            text: "By top level category",
          },
          legend: {
            orient: "horizontal",
            bottom: 10,
            top: "bottom",
          },
          tooltip: {
            trigger: "axis",
            axisPointer: {
              type: "shadow",
            },
            formatter: tooltipFormatterStackedBarChart,
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
          ...defaultChartOptions,
          title: {
            text: "By category",
          },
          tooltip: {
            trigger: "axis",
            axisPointer: {
              type: "shadow",
            },
            formatter: tooltipFormatterStackedBarChart,
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
      duration.includes(t.timestamp) &&
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
      <ExpenseCharts transactions={filteredTransactions} />
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
