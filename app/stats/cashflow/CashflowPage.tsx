"use client";
import { MonthlyChart } from "components/charts/Monthly";
import { MonthlyOwnShare } from "components/charts/MonthlySum";
import { RunningAverageAmounts } from "components/charts/RunningAverage";
import { YearlyChart } from "components/charts/Yearly";
import { YearlyOwnShare } from "components/charts/YearlySum";
import { DurationSelector, LAST_6_MONTHS } from "components/DurationSelector";
import { undoTailwindInputStyles } from "components/forms/Select";
import {
  isFullyConfigured,
  NotConfiguredYet,
} from "components/NotConfiguredYet";
import { startOfMonth, startOfYear } from "date-fns";
import { AmountWithCurrency } from "lib/AmountWithCurrency";
import {
  AllDatabaseDataContextProvider,
  useAllDatabaseDataContext,
} from "lib/ClientSideModel";
import { useDisplayCurrency } from "lib/displaySettings";
import { AllDatabaseData } from "lib/model/AllDatabaseDataModel";
import { transactionIsDescendant } from "lib/model/Category";
import { TransactionsStatsInput } from "lib/stats/TransactionsStatsInput";
import { MoneyTimeseries } from "lib/util/Timeseries";
import { useState } from "react";
import Select from "react-select";

export function CashflowCharts({ input }: { input: TransactionsStatsInput }) {
  const displayCurrency = useDisplayCurrency();
  const { bankAccounts, stocks, exchange } = useAllDatabaseDataContext();
  const zero = AmountWithCurrency.zero(displayCurrency);
  // collect monthly in/out amounts
  const moneyOut = new MoneyTimeseries(displayCurrency);
  moneyOut.appendOwnShare(
    bankAccounts,
    stocks,
    exchange,
    ...input.expensesAllTime(),
  );
  const moneyIn = new MoneyTimeseries(displayCurrency);
  moneyIn.appendOwnShare(
    bankAccounts,
    stocks,
    exchange,
    ...input.incomeAllTime(),
  );
  // calculate cashflow for each month
  const dataMonthsIndex = new Set<number>(
    [...input.expensesAllTime(), ...input.incomeAllTime()].map((t) =>
      startOfMonth(t.timestampEpoch).getTime(),
    ),
  );
  const dataMonths = [...dataMonthsIndex.keys()].sort();
  const cashflow = new MoneyTimeseries(displayCurrency);
  dataMonths.forEach((m) =>
    cashflow.append(m, moneyIn.month(m).subtract(moneyOut.month(m))),
  );
  // calculate cumulative cashflow for display months only
  const displayMonths = input.months().map((x) => x.getTime());
  const cashflowCumulative = new MoneyTimeseries(displayCurrency);
  let current = zero;
  for (const m of displayMonths) {
    current = current.add(cashflow.month(m));
    cashflowCumulative.append(m, current);
  }
  const yearsIncomplete =
    startOfYear(input.interval().start).getTime() != +input.interval().start ||
    startOfYear(input.interval().end).getTime() != +input.interval().end;
  return (
    <>
      <MonthlyChart
        data={cashflow}
        duration={input.interval()}
        title="Monthly cashflow"
      />
      <MonthlyChart
        data={cashflowCumulative}
        duration={input.interval()}
        title="Monthly cashflow (cumulative)"
        type="line"
      />
      <RunningAverageAmounts
        title="Cashflow running average (over 12 months)"
        timeseries={cashflow}
        duration={input.interval()}
        maxWindowLength={12}
      />
      <MonthlyOwnShare
        title="Monthly out"
        transactions={input.expenses()}
        duration={input.interval()}
      />
      <MonthlyOwnShare
        title="Monthly in"
        transactions={input.income()}
        duration={input.interval()}
      />

      {yearsIncomplete && (
        <div className="text-medium rounded border bg-yellow-300 p-2 text-lg text-slate-700">
          Showing data for incomplete years
        </div>
      )}
      <YearlyChart
        data={cashflow}
        duration={input.interval()}
        title="Yearly cashflow"
      />
      <YearlyChart
        data={cashflowCumulative}
        duration={input.interval()}
        title="Yearly cashflow (cumulative)"
        type="line"
      />
      <YearlyOwnShare
        title="Yearly out"
        transactions={input.expenses()}
        duration={input.interval()}
      />
      <YearlyOwnShare
        title="Yearly in"
        transactions={input.income()}
        duration={input.interval()}
      />
    </>
  );
}

function NonEmptyPageContent() {
  const [duration, setDuration] = useState(LAST_6_MONTHS);
  const { transactions, categories, displaySettings } =
    useAllDatabaseDataContext();
  const [excludeCategories, setExcludeCategories] = useState(
    displaySettings.excludeCategoryIdsInStats(),
  );
  const categoryOptions = categories.map((a) => ({
    value: a.id(),
    label: a.nameWithAncestors(),
  }));
  const filteredTransactions = transactions.filter(
    (t) =>
      !excludeCategories.some((cid) =>
        transactionIsDescendant(t, cid, categories),
      ),
  );
  const input = new TransactionsStatsInput(filteredTransactions, duration);
  return (
    <>
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
      <CashflowCharts input={input} />
    </>
  );
}

export function CashflowPage({ dbData }: { dbData: AllDatabaseData }) {
  if (!isFullyConfigured(dbData)) {
    return <NotConfiguredYet />;
  }
  return (
    <AllDatabaseDataContextProvider dbData={dbData}>
      <NonEmptyPageContent />
    </AllDatabaseDataContextProvider>
  );
}
