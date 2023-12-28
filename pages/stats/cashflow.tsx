import { DurationSelector, LAST_6_MONTHS } from "components/DurationSelector";
import { undoTailwindInputStyles } from "components/forms/Select";
import {
  isFullyConfigured,
  NotConfiguredYet,
} from "components/NotConfiguredYet";
import { StatsPageLayout } from "components/StatsPageLayout";
import { eachMonthOfInterval, isWithinInterval, startOfMonth } from "date-fns";
import ReactEcharts from "echarts-for-react";
import { AmountWithCurrency } from "lib/AmountWithCurrency";
import { defaultChartOptions } from "lib/charts";
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

export function CashflowCharts({
  transactions,
  duration,
}: {
  transactions: Transaction[];
  duration: Interval;
}) {
  const displayCurrency = useDisplayCurrency();
  const zero = AmountWithCurrency.zero(displayCurrency);
  const months = eachMonthOfInterval(duration).map((x) => x.getTime());
  const zeroes: [number, AmountWithCurrency][] = months.map((m) => [m, zero]);

  const moneyOut = new Map<number, AmountWithCurrency>(zeroes);
  transactions
    .filter((t) => t.isPersonalExpense() || t.isThirdPartyExpense())
    .forEach((t) => {
      const exchanged = t.amountOwnShare(displayCurrency);
      const ts = startOfMonth(t.timestamp).getTime();
      moneyOut.set(ts, moneyOut.get(ts).add(exchanged));
    });

  const moneyIn = new Map<number, AmountWithCurrency>(zeroes);
  transactions
    .filter((t) => t.isIncome())
    .forEach((t) => {
      const exchanged = t.amountOwnShare(displayCurrency);
      const ts = startOfMonth(t.timestamp).getTime();
      moneyIn.set(ts, moneyIn.get(ts).add(exchanged));
    });

  const cashflow = new Map<number, AmountWithCurrency>(
    months.map((m) => [m, moneyIn.get(m).subtract(moneyOut.get(m))])
  );
  let current = zero;
  const cashflowCumulative = new Map<number, AmountWithCurrency>(zeroes);
  for (const m of months) {
    current = current.add(cashflow.get(m));
    cashflowCumulative.set(m, current);
  }

  return (
    <>
      <ReactEcharts
        notMerge
        option={{
          ...defaultChartOptions(displayCurrency, months),
          title: {
            text: "Cashflow",
          },
          series: [
            {
              type: "bar",
              name: "Money in vs out",
              data: months.map((m) => cashflow.get(m).dollar()),
            },
          ],
        }}
      />
      <ReactEcharts
        notMerge
        option={{
          ...defaultChartOptions(displayCurrency, months),
          title: {
            text: "Cashflow (cumulative)",
          },
          series: [
            {
              type: "line",
              name: "Money in vs out (cumulative)",
              data: months.map((m) => cashflowCumulative.get(m).dollar()),
            },
          ],
        }}
      />
      <ReactEcharts
        notMerge
        option={{
          ...defaultChartOptions(displayCurrency, months),
          title: {
            text: "Money out",
          },
          series: [
            {
              type: "bar",
              name: "Money Out",
              data: months.map((m) => moneyOut.get(m).dollar()),
            },
          ],
        }}
      />
      <ReactEcharts
        notMerge
        option={{
          ...defaultChartOptions(displayCurrency, months),
          title: {
            text: "Money In",
          },
          series: [
            {
              type: "bar",
              name: "Money In",
              data: months.map((m) => moneyIn.get(m).dollar()),
            },
          ],
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
      <CashflowCharts transactions={filteredTransactions} duration={duration} />
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
