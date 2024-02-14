'use client';
import {CurrencyExchangeFailed} from '@/app/stats/CurrencyExchangeFailed';
import {ExcludedCategoriesSelector} from '@/app/stats/ExcludedCategoriesSelector';
import {ExpensesByRootCategory} from '@/app/stats/expense/ByRootCategory';
import {useStatsPageProps} from '@/app/stats/modelHelpers';
import {ExpenseByChildCategory} from '@/app/stats/(aggregate-by-period)/ExpenseByChildCategory';
import {IncomeByChildCategory} from '@/app/stats/(aggregate-by-period)/IncomeByChildCategory';
import {Navigation} from '@/app/stats/(aggregate-by-period)/Navigation';
import {PeriodSummary} from '@/app/stats/(aggregate-by-period)/PeriodSummary';
import {TopVendorsBySpend} from '@/app/stats/(aggregate-by-period)/TopVendorsBySpend';
import {TopVendorsByTransactionCount} from '@/app/stats/(aggregate-by-period)/TopVendorsByTransactionCount';
import {
  NotConfiguredYet,
  isFullyConfigured,
} from '@/components/NotConfiguredYet';
import {
  SortableTransactionsList,
  SortingMode,
} from '@/components/transactions/SortableTransactionsList';
import {
  AllDatabaseDataContextProvider,
  useAllDatabaseDataContext,
} from '@/lib/context/AllDatabaseDataContext';
import {useDisplaySettingsContext} from '@/lib/context/DisplaySettingsContext';
import {AllDatabaseData} from '@/lib/model/AllDatabaseDataModel';
import {TransactionsStatsInput} from '@/lib/stats/TransactionsStatsInput';
import {Granularity} from '@/lib/util/Granularity';
import {Interval, endOfMonth, startOfMonth} from 'date-fns';
import {useState} from 'react';

export function MonthlyStats({input}: {input: TransactionsStatsInput}) {
  return (
    <div className="space-y-4">
      <PeriodSummary input={input} />
      <div>
        <h1 className="text-xl font-medium leading-7">
          Expenses ({input.expenses().length})
        </h1>
        <ExpensesByRootCategory input={input} />
        <ExpenseByChildCategory input={input} />
        <SortableTransactionsList
          transactions={input.expenses().map(({t}) => t)}
          initialSorting={SortingMode.AMOUNT_DESC}
        />
      </div>
      <div>
        <h1 className="text-xl font-medium leading-7">
          Income ({input.income().length})
        </h1>
        <IncomeByChildCategory input={input} />
        <SortableTransactionsList
          transactions={input.income().map(({t}) => t)}
          initialSorting={SortingMode.AMOUNT_DESC}
        />
      </div>
      <h1 className="text-xl font-medium leading-7">Vendors</h1>
      <TopVendorsBySpend input={input} />
      <TopVendorsByTransactionCount input={input} />
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
