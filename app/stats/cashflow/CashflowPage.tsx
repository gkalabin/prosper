'use client';
import {CurrencyExchangeFailed} from 'app/stats/CurrencyExchangeFailed';
import {ExcludedCategoriesSelector} from 'app/stats/ExcludedCategoriesSelector';
import {filterExcludedTransactions} from 'app/stats/modelHelpers';
import {DurationSelector, LAST_6_MONTHS} from 'components/DurationSelector';
import {NotConfiguredYet, isFullyConfigured} from 'components/NotConfiguredYet';
import {MonthlyOwnShare} from 'components/charts/MonthlySum';
import {RunningAverageAmounts} from 'components/charts/RunningAverage';
import {YearlyChart} from 'components/charts/Yearly';
import {YearlyOwnShare} from 'components/charts/YearlySum';
import Charts from 'components/charts/interface';
import {startOfMonth, startOfYear} from 'date-fns';
import {AmountWithCurrency} from 'lib/AmountWithCurrency';
import {
  AllDatabaseDataContextProvider,
  useAllDatabaseDataContext,
} from 'lib/context/AllDatabaseDataContext';
import {
  useDisplayCurrency,
  useDisplaySettingsContext,
} from 'lib/context/DisplaySettingsContext';
import {AllDatabaseData} from 'lib/model/AllDatabaseDataModel';
import {Transaction} from 'lib/model/transaction/Transaction';
import {amountOwnShare} from 'lib/model/transaction/amounts';
import {TransactionsStatsInput} from 'lib/stats/TransactionsStatsInput';
import {Granularity, MoneyTimeseries} from 'lib/util/Timeseries';
import {useState} from 'react';

export function CashflowCharts({input}: {input: TransactionsStatsInput}) {
  const displayCurrency = useDisplayCurrency();
  const {bankAccounts, stocks, exchange} = useAllDatabaseDataContext();
  const zero = AmountWithCurrency.zero(displayCurrency);
  const failedToExchange: Transaction[] = [];
  // collect monthly in/out amounts
  const moneyOut = new MoneyTimeseries(displayCurrency, Granularity.MONTHLY);
  for (const t of input.expensesAllTime()) {
    const exchanged = amountOwnShare(
      t,
      displayCurrency,
      bankAccounts,
      stocks,
      exchange
    );
    if (!exchanged) {
      failedToExchange.push(t);
      continue;
    }
    moneyOut.increment(t.timestampEpoch, exchanged);
  }
  const moneyIn = new MoneyTimeseries(displayCurrency, Granularity.MONTHLY);
  for (const t of input.incomeAllTime()) {
    const exchanged = amountOwnShare(
      t,
      displayCurrency,
      bankAccounts,
      stocks,
      exchange
    );
    if (!exchanged) {
      failedToExchange.push(t);
      continue;
    }
    moneyIn.increment(t.timestampEpoch, exchanged);
  }
  // calculate cashflow for each month
  const dataMonthsIndex = new Set<number>(
    [...input.expensesAllTime(), ...input.incomeAllTime()].map(t =>
      startOfMonth(t.timestampEpoch).getTime()
    )
  );
  const dataMonths = [...dataMonthsIndex.keys()].sort();
  const cashflow = new MoneyTimeseries(displayCurrency, Granularity.MONTHLY);
  dataMonths.forEach(m =>
    cashflow.set(m, moneyIn.get(m).subtract(moneyOut.get(m)))
  );
  // calculate cumulative cashflow for display months only
  const displayMonths = input.months().map(x => x.getTime());
  const cashflowCumulative = new MoneyTimeseries(
    displayCurrency,
    Granularity.MONTHLY
  );
  let current = zero;
  for (const m of displayMonths) {
    current = current.add(cashflow.get(m));
    cashflowCumulative.set(m, current);
  }
  const yearsIncomplete =
    startOfYear(input.interval().start).getTime() != +input.interval().start ||
    startOfYear(input.interval().end).getTime() != +input.interval().end;
  return (
    <>
      <CurrencyExchangeFailed failedTransactions={failedToExchange} />

      <Charts.Bar
        title={'Monthly cashflow'}
        series={{data: cashflow}}
        interval={input.interval()}
      />
      <Charts.Line
        title={'Monthly cashflow (cumulative)'}
        series={{data: cashflowCumulative}}
        interval={input.interval()}
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
  const {transactions, categories} = useAllDatabaseDataContext();
  const {displaySettings} = useDisplaySettingsContext();
  const [excludeCategories, setExcludeCategories] = useState(
    displaySettings.excludeCategoryIdsInStats()
  );
  const filteredTransactions = filterExcludedTransactions(
    transactions,
    excludeCategories,
    categories
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
        allCategories={categories}
      />
      <CashflowCharts input={input} />
    </div>
  );
}

export function CashflowPage({dbData}: {dbData: AllDatabaseData}) {
  if (!isFullyConfigured(dbData)) {
    return <NotConfiguredYet />;
  }
  return (
    <AllDatabaseDataContextProvider dbData={dbData}>
      <NonEmptyPageContent />
    </AllDatabaseDataContextProvider>
  );
}
