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
import { differenceInYears, startOfMonth } from "date-fns";
import ReactEcharts from "echarts-for-react";
import { AmountWithCurrency } from "lib/AmountWithCurrency";
import {
  AllDatabaseDataContextProvider,
  useAllDatabaseDataContext,
} from "lib/ClientSideModel";
import { defaultMonthlyMoneyChart, legend } from "lib/charts";
import { useDisplayCurrency } from "lib/displaySettings";
import { AllDatabaseData } from "lib/model/AllDatabaseDataModel";
import { transactionIsDescendant } from "lib/model/Category";
import { Transaction } from "lib/model/transaction/Transaction";
import { amountOwnShare } from "lib/model/transaction/amounts";
import { TransactionsStatsInput } from "lib/stats/TransactionsStatsInput";
import { useState } from "react";

export function IncomeCharts({ input }: { input: TransactionsStatsInput }) {
  const displayCurrency = useDisplayCurrency();
  const { categories, bankAccounts, stocks, exchange } =
    useAllDatabaseDataContext();
  const zero = AmountWithCurrency.zero(displayCurrency);
  const months = input.months().map((x) => x.getTime());
  const zeroes: [number, AmountWithCurrency][] = months.map((m) => [m, zero]);
  const byCategoryIdAndMonth = new Map<
    number,
    Map<number, AmountWithCurrency>
  >();
  const failedToExchange: Transaction[] = [];
  for (const t of input.income()) {
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
    const categorySeries =
      byCategoryIdAndMonth.get(t.categoryId) ?? new Map(zeroes);
    categorySeries.set(ts, exchanged.add(categorySeries.get(ts) ?? zero));
    byCategoryIdAndMonth.set(t.categoryId, categorySeries);
  }

  return (
    <>
      <CurrencyExchangeFailed failedTransactions={failedToExchange} />
      <MonthlyOwnShare
        title="Monthly income"
        transactions={input.income()}
        duration={input.interval()}
      />
      {differenceInYears(input.interval().end, input.interval().start) > 1 && (
        <YearlyOwnShare
          title="Yearly income"
          transactions={input.income()}
          duration={input.interval()}
        />
      )}
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
  const { transactions, categories, displaySettings } =
    useAllDatabaseDataContext();
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
      <IncomeCharts input={input} />
    </div>
  );
}

export function IncomePage({ dbData }: { dbData: AllDatabaseData }) {
  if (!isFullyConfigured(dbData)) {
    return <NotConfiguredYet />;
  }
  return (
    <AllDatabaseDataContextProvider dbData={dbData}>
      <NonEmptyPageContent />
    </AllDatabaseDataContextProvider>
  );
}
