import { DurationSelector } from "components/DurationSelector";
import { undoTailwindInputStyles } from "components/forms/Select";
import Layout from "components/Layout";
import {
  isFullyConfigured,
  NotConfiguredYet,
} from "components/NotConfiguredYet";
import { ButtonLink } from "components/ui/buttons";
import { format, startOfMonth } from "date-fns";
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

export function MoneyInMoneyOut(props: { transactions: Transaction[] }) {
  const [showDebugTable, setShowDebugTable] = useState(false);
  const displayCurrency = useDisplayCurrency();
  const { exchange } = useAllDatabaseDataContext();
  const zero = new AmountWithCurrency({
    amountCents: 0,
    currency: displayCurrency,
  });

  const nonThirdPartyTransactions = props.transactions.filter(
    (t) => !t.isThirdPartyExpense()
  );
  const moneyOut: { [firstOfMonthEpoch: number]: AmountWithCurrency } = {};
  const moneyIn: { [firstOfMonthEpoch: number]: AmountWithCurrency } = {};
  const delta: { [firstOfMonthEpoch: number]: AmountWithCurrency } = {};
  const cumulativeDelta: { [firstOfMonthEpoch: number]: AmountWithCurrency } =
    {};
  const monthsIndex: { [firstOfMonthEpoch: number]: boolean } = {};
  for (const t of nonThirdPartyTransactions) {
    const ts = startOfMonth(t.timestamp).getTime();
    monthsIndex[ts] = true;
    moneyIn[ts] ??= zero;
    moneyOut[ts] ??= zero;
    delta[ts] ??= zero;
    if (t.isPersonalExpense()) {
      const exchanged = exchange.exchange(
        t.amount(),
        displayCurrency,
        t.timestamp
      );
      moneyOut[ts] = moneyOut[ts].add(exchanged);
      delta[ts] = delta[ts].subtract(exchanged);
    }
    if (t.isIncome()) {
      const exchanged = exchange.exchange(
        t.amount(),
        displayCurrency,
        t.timestamp
      );
      moneyIn[ts] = moneyIn[ts].add(exchanged);
      delta[ts] = delta[ts].add(exchanged);
    }
  }

  const months = Object.keys(monthsIndex)
    .map((x) => +x)
    .sort();
  months.forEach((m) => {
    moneyIn[m] ??= zero;
    moneyOut[m] ??= zero;
    delta[m] ??= zero;
    cumulativeDelta[m] ??= zero;
  });
  let currentDeltaSum = zero;
  for (const ts of Object.keys(monthsIndex).sort()) {
    currentDeltaSum = currentDeltaSum.add(delta[ts] ?? zero);
    cumulativeDelta[ts] = currentDeltaSum;
  }

  const currencyFormatter = (value) =>
    displayCurrency.format(value, { maximumFractionDigits: 0 });
  const defaultChartOptions: EChartsOption = {
    grid: {
      containLabel: true,
    },
    tooltip: {
      formatter: (params) => {
        const { name, value } = params;
        return `${name}: ${currencyFormatter(value)}`;
      },
    },
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
      <ReactEcharts
        option={Object.assign({}, defaultChartOptions, {
          title: {
            text: "Money In vs Money Out",
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
            {
              type: "bar",
              name: "Money Out",
              data: months.map((m) => Math.round(moneyOut[m].dollar())),
              itemStyle: {
                color: "#b91c1c",
              },
            },
          ],
        })}
      />

      <div className="m-4">
        {showDebugTable && (
          <>
            <ButtonLink onClick={() => setShowDebugTable(false)}>
              Hide debug table
            </ButtonLink>
            <IncomeExpenseDebugTable transactions={nonThirdPartyTransactions} />
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
        option={Object.assign({}, defaultChartOptions, {
          title: {
            text: "Delta (difference between money in and money out)",
          },
          series: [
            {
              type: "bar",
              name: "Delta",
              data: months.map((m) => Math.round(delta[m].dollar())),
            },
          ],
        })}
      />

      <ReactEcharts
        option={Object.assign({}, defaultChartOptions, {
          title: {
            text: "Cumulative delta",
          },
          series: [
            {
              type: "bar",
              name: "Delta",
              data: months.map((m) => Math.round(cumulativeDelta[m].dollar())),
            },
          ],
        })}
      />
    </>
  );
}

function IncomeExpenseDebugTable(props: { transactions: Transaction[] }) {
  return (
    <>
      <h2 className="my-2 text-2xl font-medium leading-5">Income</h2>
      <DebugTable
        transactions={props.transactions.filter((x) => x.isIncome())}
      />

      <h2 className="my-2 text-2xl font-medium leading-5">Expense</h2>
      <DebugTable
        transactions={props.transactions.filter((x) => x.isPersonalExpense())}
      />
    </>
  );
}

function DebugTable(props: { transactions: Transaction[] }) {
  const displayCurrency = useDisplayCurrency();
  const { exchange } = useAllDatabaseDataContext();
  const zero = new AmountWithCurrency({
    amountCents: 0,
    currency: displayCurrency,
  });
  const transactionsSortedByMonthAndAmount = [...props.transactions].sort(
    (a, b) => {
      const aTs = startOfMonth(a.timestamp).getTime();
      const bTs = startOfMonth(b.timestamp).getTime();
      if (aTs != bTs) {
        return bTs - aTs;
      }
      const exchangedA = exchange.exchange(
        a.amount(),
        displayCurrency,
        a.timestamp
      );
      const exchangedB = exchange.exchange(
        b.amount(),
        displayCurrency,
        b.timestamp
      );
      return exchangedB.dollar() - exchangedA.dollar();
    }
  );
  const rows = [];
  let cumulativeAmount = zero;
  const TD = (props: React.TdHTMLAttributes<HTMLTableCellElement>) => (
    <td className="border p-2" {...props}>
      {props.children}
    </td>
  );
  let previousMonth = new Date(0);
  let transactionsShown = 0;
  let aggregateSum = zero;
  let aggregateCount = 0;
  let aggregateMin = zero;
  let aggregateMax = zero;
  for (const t of transactionsSortedByMonthAndAmount) {
    const exchanged = exchange.exchange(
      t.amount(),
      displayCurrency,
      t.timestamp
    );
    if (startOfMonth(t.timestamp).getTime() != previousMonth.getTime()) {
      if (aggregateCount > 0) {
        rows.push(
          <tr>
            <TD>&nbsp;</TD>
            <TD>
              {aggregateCount} transactions ranging from {aggregateMin.format()}{" "}
              to {aggregateMax.format()}
            </TD>
            <TD>{aggregateSum.format()}</TD>
            <TD>{cumulativeAmount.format()}</TD>
          </tr>
        );
      }

      previousMonth = startOfMonth(t.timestamp);
      cumulativeAmount = zero;
      aggregateCount = 0;
      aggregateSum = zero;
      aggregateMin = zero;
      aggregateMax = zero;
      transactionsShown = 0;
      rows.push(
        <tr>
          <TD colSpan={4} className="p-2 text-center text-lg font-medium">
            {format(t.timestamp, "MMMM yyyy")}
          </TD>
        </tr>
      );
    }
    cumulativeAmount = cumulativeAmount.add(exchanged);
    if (transactionsShown < 15) {
      rows.push(
        <tr key={t.id}>
          <TD>{format(t.timestamp, "yyyy-MM-dd")}</TD>
          <TD>
            {t.hasVendor() ? t.vendor() : ""}{" "}
            <span className="italic">{t.description}</span>
          </TD>
          <TD>{exchanged.format()}</TD>
          <TD>{cumulativeAmount.format()}</TD>
        </tr>
      );
      transactionsShown++;
    } else {
      aggregateSum = aggregateSum.add(exchanged);
      aggregateCount++;
      if (aggregateMin.cents() == 0 || exchanged.lessThan(aggregateMin)) {
        aggregateMin = exchanged;
      }
      if (aggregateMax.lessThan(exchanged)) {
        aggregateMax = exchanged;
      }
    }
  }
  return (
    <>
      <table className="table-auto border-collapse border">
        <thead>
          <TD>Date</TD>
          <TD>Vendor</TD>
          <TD>Amount</TD>
          <TD>Amount cumulative</TD>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </>
  );
}

function InOutPageContent() {
  const [duration, setDuration] = useState(LAST_6_MONTHS);
  const [excludeCategories, setExcludeCategories] = useState([]);
  const { transactions, categories } = useAllDatabaseDataContext();

  const categoryOptions = categories.map((a) => ({
    value: a.id,
    label: a.nameWithAncestors,
  }));

  const filteredTransactions = transactions.filter(
    (t) =>
      duration.includes(t.timestamp) &&
      !excludeCategories.includes(t.category.id)
  );
  return (
    <Layout
      subheader={[
        {
          title: "Income/Expense",
          path: "/stats/in-out",
        },
        {
          title: "Month drilldown",
          path: "/stats/monthly",
        },
      ]}
    >
      <DurationSelector duration={duration} onChange={setDuration} />

      <div className="mb-4">
        <label
          htmlFor="categoryIds"
          className="block text-sm font-medium text-gray-700"
        >
          Categories to exclude
        </label>
        <Select
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

      <MoneyInMoneyOut transactions={filteredTransactions} />
    </Layout>
  );
}

export const getServerSideProps = allDbDataProps;
export default function InOutPage(
  dbData: InferGetServerSidePropsType<typeof getServerSideProps>
) {
  if (!isFullyConfigured(dbData)) {
    return <NotConfiguredYet />;
  }
  return (
    <AllDatabaseDataContextProvider dbData={dbData}>
      <InOutPageContent />
    </AllDatabaseDataContextProvider>
  );
}
