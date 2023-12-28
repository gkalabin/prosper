import { DurationSelector } from "components/DurationSelector";
import { undoTailwindInputStyles } from "components/forms/Select";
import {
    isFullyConfigured,
    NotConfiguredYet
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
    useAllDatabaseDataContext
} from "lib/ClientSideModel";
import { useDisplayCurrency } from "lib/displaySettings";
import { LAST_6_MONTHS } from "lib/Interval";
import { Transaction } from "lib/model/Transaction";
import { allDbDataProps } from "lib/ServerSideDB";
import { formatMonth } from "lib/TimeHelpers";
import { InferGetServerSidePropsType } from "next";
import { useState } from "react";
import Select from "react-select";

export function IncomeCharts(props: { transactions: Transaction[] }) {
  const [showDebugTable, setShowDebugTable] = useState(false);
  const displayCurrency = useDisplayCurrency();
  const { exchange, categories } = useAllDatabaseDataContext();
  const zero = new AmountWithCurrency({
    amountCents: 0,
    currency: displayCurrency,
  });

  const incomeTransactions = props.transactions.filter((t) => t.isIncome());
  const moneyIn: { [firstOfMonthEpoch: number]: AmountWithCurrency } = {};
  const byCategoryIdAndMonth = new Map<
    number,
    Map<number, AmountWithCurrency>
  >();
  const monthsIndex: { [firstOfMonthEpoch: number]: boolean } = {};
  for (const t of incomeTransactions) {
    const ts = startOfMonth(t.timestamp).getTime();
    monthsIndex[ts] = true;
    moneyIn[ts] ??= zero;
    const exchanged = exchange.exchange(
      t.amount(),
      displayCurrency,
      t.timestamp
    );
    moneyIn[ts] = moneyIn[ts].add(exchanged);
    const categorySeries = byCategoryIdAndMonth.get(t.category.id()) ?? new Map();
    const current = categorySeries.get(ts) ?? zero;
    categorySeries.set(ts, exchanged.add(current));
    byCategoryIdAndMonth.set(t.category.id(), categorySeries);
  }

  const months = Object.keys(monthsIndex)
    .map((x) => +x)
    .sort();
  months.forEach((m) => {
    moneyIn[m] ??= zero;
    [...byCategoryIdAndMonth.values()].forEach((v) => {
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
            <DebugTable transactions={incomeTransactions} />
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
        option={Object.assign({}, defaultChartOptions, {
          title: {
            text: "Total money in",
          },
          legend: {
            orient: "horizontal",
            bottom: 10,
            top: "bottom",
          },
          series: [
            {
              type: "bar",
              name: "Money In",
              data: months.map((m) => Math.round(moneyIn[m].dollar())),
              itemStyle: {
                color: "#15803d",
              },
            },
          ],
        })}
      />
      <ReactEcharts
        notMerge
        option={Object.assign({}, defaultChartOptions, {
          title: {
            text: "By category",
          },
          legend: {
            orient: "horizontal",
            bottom: 10,
            top: "bottom",
          },
          series: [...byCategoryIdAndMonth.entries()].map(
            ([categoryId, series]) => ({
              type: "bar",
              stack: "moneyIn",
              name: categories.find((c) => c.id() === categoryId).name(),
              data: months.map((m) => Math.round(series.get(m).dollar())),
            })
          ),
        })}
      />
    </>
  );
}

function PageContent() {
  const [duration, setDuration] = useState(LAST_6_MONTHS);
  const { transactions, categories, displaySettings } = useAllDatabaseDataContext();
  const [excludeCategories, setExcludeCategories] = useState(displaySettings.excludeCategoryIdsInStats());
  const categoryOptions = categories.map((a) => ({
    value: a.id(),
    label: a.nameWithAncestors(),
  }));
  const filteredTransactions = transactions.filter(
    (t) =>
      duration.includes(t.timestamp) &&
      !excludeCategories.includes(t.category.id())
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
      <IncomeCharts transactions={filteredTransactions} />
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
