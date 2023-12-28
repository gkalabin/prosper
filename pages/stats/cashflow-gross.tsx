import { DurationSelector, LAST_6_MONTHS } from "components/DurationSelector";
import { undoTailwindInputStyles } from "components/forms/Select";
import {
  isFullyConfigured,
  NotConfiguredYet,
} from "components/NotConfiguredYet";
import { DebugTable } from "components/stats/DebugTable";
import { StatsPageLayout } from "components/StatsPageLayout";
import { ButtonLink } from "components/ui/buttons";
import { eachMonthOfInterval, isWithinInterval, startOfMonth } from "date-fns";
import ReactEcharts from "echarts-for-react";
import { AmountWithCurrency } from "lib/AmountWithCurrency";
import { defaultChartOptions, legend } from "lib/charts";
import {
  AllDatabaseDataContextProvider,
  useAllDatabaseDataContext,
} from "lib/ClientSideModel";
import { useDisplayCurrency } from "lib/displaySettings";
import { Transaction } from "lib/model/Transaction";
import { allDbDataProps } from "lib/ServerSideDB";
import { InferGetServerSidePropsType } from "next";
import { useState } from "react";
import Select from "react-select";

export function MoneyInMoneyOut(props: {
  transactions: Transaction[];
  duration: Interval;
}) {
  const [showDebugTable, setShowDebugTable] = useState(false);
  const displayCurrency = useDisplayCurrency();
  const zero = AmountWithCurrency.zero(displayCurrency);
  const months = eachMonthOfInterval(props.duration).map((x) => x.getTime());
  const zeroes: [number, AmountWithCurrency][] = months.map((m) => [m, zero]);

  const nonThirdPartyTransactions = props.transactions.filter(
    (t) => !t.isThirdPartyExpense()
  );
  const moneyOut = new Map<number, AmountWithCurrency>(zeroes);
  const moneyIn = new Map<number, AmountWithCurrency>(zeroes);
  const delta = new Map<number, AmountWithCurrency>(zeroes);
  for (const t of nonThirdPartyTransactions) {
    const ts = startOfMonth(t.timestamp).getTime();
    if (t.isPersonalExpense()) {
      const exchanged = t.amountAllParties(displayCurrency);
      moneyOut.set(ts, moneyOut.get(ts).add(exchanged));
      delta.set(ts, delta.get(ts).subtract(exchanged));
    }
    if (t.isIncome()) {
      const exchanged = t.amountAllParties(displayCurrency);
      moneyIn.set(ts, moneyIn.get(ts).add(exchanged));
      delta.set(ts, delta.get(ts).add(exchanged));
    }
  }

  let current = zero;
  const cumulativeDelta = new Map<number, AmountWithCurrency>(zeroes);
  for (const m of months) {
    current = current.add(delta.get(m));
    cumulativeDelta.set(m, current);
  }

  return (
    <>
      <ReactEcharts
        option={{
          ...defaultChartOptions(displayCurrency, months),
          ...legend(),
          title: {
            text: "Money In vs Money Out",
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
            {
              type: "bar",
              name: "Money Out",
              data: months.map((m) => Math.round(moneyOut.get(m).dollar())),
              itemStyle: {
                color: "#b91c1c",
              },
            },
          ],
        }}
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
        option={{
          ...defaultChartOptions(displayCurrency, months),
          title: {
            text: "Delta (difference between money in and money out)",
          },
          series: [
            {
              type: "bar",
              name: "Delta",
              data: months.map((m) => Math.round(delta.get(m).dollar())),
            },
          ],
        }}
      />

      <ReactEcharts
        option={{
          ...defaultChartOptions(displayCurrency, months),
          title: {
            text: "Cumulative delta",
          },
          series: [
            {
              type: "bar",
              name: "Delta",
              data: months.map((m) =>
                Math.round(cumulativeDelta.get(m).dollar())
              ),
            },
          ],
        }}
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

function InOutPageContent() {
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
      <MoneyInMoneyOut
        transactions={filteredTransactions}
        duration={duration}
      />
    </StatsPageLayout>
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
