'use client';
import {CurrencyExchangeFailed} from '@/app/stats/CurrencyExchangeFailed';
import {ExcludedCategoriesSelector} from '@/app/stats/ExcludedCategoriesSelector';
import {ExpensesByRootCategory} from '@/app/stats/expense/ByRootCategory';
import {useStatsPageProps} from '@/app/stats/modelHelpers';
import {ExpenseByChildCategory} from '@/app/stats/quarterly/ExpenseByChildCategory';
import {Navigation} from '@/app/stats/quarterly/Navigation';
import {PeriodSummary} from '@/app/stats/quarterly/PeriodSummary';
import {
  NotConfiguredYet,
  isFullyConfigured,
} from '@/components/NotConfiguredYet';
import {ChildCategoryOwnShareChart} from '@/components/charts/CategoryPie';
import {
  TopNVendorsMostSpent,
  TopNVendorsMostTransactions,
} from '@/components/charts/Vendor';
import {
  SortableTransactionsList,
  SortingMode,
} from '@/components/transactions/SortableTransactionsList';
import {Interval, endOfMonth, isSameMonth, startOfMonth} from 'date-fns';
import {
  AllDatabaseDataContextProvider,
  useAllDatabaseDataContext,
} from '@/lib/context/AllDatabaseDataContext';
import {useDisplaySettingsContext} from '@/lib/context/DisplaySettingsContext';
import {AllDatabaseData} from '@/lib/model/AllDatabaseDataModel';
import {Income} from '@/lib/model/transaction/Income';
import {
  Expense,
  isExpense,
  isIncome,
} from '@/lib/model/transaction/Transaction';
import {TransactionsStatsInput} from '@/lib/stats/TransactionsStatsInput';
import {Granularity} from '@/lib/util/Granularity';
import {useState} from 'react';

export function MonthlyStats({input}: {input: TransactionsStatsInput}) {
  return (
    <div className="space-y-4">
      <PeriodSummary input={input} />
      <div>
        <h1 className="text-xl font-medium leading-7">
          Expenses ({input.expensesExchanged().length})
        </h1>
        <ExpensesByRootCategory input={input} />
        <ExpenseByChildCategory input={input} />
        <SortableTransactionsList
          transactions={input.expensesExchanged().map(({t}) => t)}
          initialSorting={SortingMode.AMOUNT_DESC}
        />
      </div>
      <div>
        <h1 className="text-xl font-medium leading-7">
          Income ({input.incomeExchanged().length})
        </h1>
        <ChildCategoryOwnShareChart
          title="Income category"
          transactions={input
            .incomeExchanged()
            .map(({t}) => t)
            .filter((t): t is Income => isIncome(t))}
        />
        <SortableTransactionsList
          transactions={input.incomeExchanged().map(({t}) => t)}
          initialSorting={SortingMode.AMOUNT_DESC}
        />
      </div>
      <VendorStats input={input} month={input.interval().start} />
    </div>
  );
}

export function VendorStats({
  input,
  month,
}: {
  input: TransactionsStatsInput;
  month: Date | number | string;
}) {
  const transactions = input
    .transactionsAllTime()
    .filter(t => isSameMonth(month, t.timestampEpoch));
  const expenses = transactions.filter((t): t is Expense => isExpense(t));
  return (
    <div>
      <h1 className="text-xl font-medium leading-7">Vendors</h1>
      <TopNVendorsMostSpent transactions={expenses} title="Most spent" n={10} />
      <TopNVendorsMostTransactions
        transactions={expenses}
        title="Most transactions"
        n={10}
      />
    </div>
  );
}

function NonEmptyPageContent() {
  const {transactions} = useAllDatabaseDataContext();
  const {displaySettings} = useDisplaySettingsContext();
  const [excludeCategories, setExcludeCategories] = useState(
    displaySettings.excludeCategoryIdsInStats()
  );
  const timestamps = transactions
    .map(t => t.timestampEpoch)
    .sort((a, b) => a - b);
  const allDataInterval = {
    start: timestamps[0],
    end: timestamps[timestamps.length - 1],
  };
  const now = new Date();
  const [month, setMonth] = useState<Interval>({
    start: startOfMonth(now),
    end: endOfMonth(now),
  });
  const {input, failed} = useStatsPageProps(excludeCategories, month);
  return (
    <div className="space-y-4">
      <ExcludedCategoriesSelector
        excludedIds={excludeCategories}
        setExcludedIds={setExcludeCategories}
      />
      <Navigation
        timeline={allDataInterval}
        granularity={Granularity.MONTHLY}
        selected={month}
        setSelected={setMonth}
      />
      <CurrencyExchangeFailed failedTransactions={failed} />
      <MonthlyStats input={input} />
    </div>
  );
}

export function MonthlyStatsPage({dbData}: {dbData: AllDatabaseData}) {
  if (!isFullyConfigured(dbData)) {
    return <NotConfiguredYet />;
  }
  return (
    <AllDatabaseDataContextProvider dbData={dbData}>
      <NonEmptyPageContent />
    </AllDatabaseDataContextProvider>
  );
}
