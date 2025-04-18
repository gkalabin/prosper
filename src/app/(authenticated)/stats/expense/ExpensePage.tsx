'use client';
import {CurrencyExchangeFailed} from '@/app/(authenticated)/stats/CurrencyExchangeFailed';
import {ExcludedCategoriesSelector} from '@/app/(authenticated)/stats/ExcludedCategoriesSelector';
import {FanoutByRootCategory} from '@/app/(authenticated)/stats/expense/FanoutByRootCategory';
import {useStatsPageProps} from '@/app/(authenticated)/stats/modelHelpers';
import {DurationSelector, LAST_6_MONTHS} from '@/components/DurationSelector';
import {
  NotConfiguredYet,
  isFullyConfigured,
} from '@/components/NotConfiguredYet';
import {MonthlyExpense} from '@/components/charts/timeseries/MonthlyExpense';
import {MonthlyExpenseAverage} from '@/components/charts/timeseries/MonthlyExpenseAverage';
import {MonthlyExpenseByCategory} from '@/components/charts/timeseries/MonthlyExpenseByCategory';
import {MonthlyExpenseByTopCategory} from '@/components/charts/timeseries/MonthlyExpenseByTopCategory';
import {YearlyExpense} from '@/components/charts/timeseries/YearlyExpense';
import {CoreDataContextProvider} from '@/lib/context/CoreDataContext';
import {useDisplaySettingsContext} from '@/lib/context/DisplaySettingsContext';
import {MarketDataContextProvider} from '@/lib/context/MarketDataContext';
import {TransactionDataContextProvider} from '@/lib/context/TransactionDataContext';
import {AllDatabaseData} from '@/lib/model/AllDatabaseDataModel';
import {useState} from 'react';

function NonEmptyPageContent() {
  const [duration, setDuration] = useState(LAST_6_MONTHS);
  const {displaySettings} = useDisplaySettingsContext();
  const [excludeCategories, setExcludeCategories] = useState(
    displaySettings.excludeCategoryIdsInStats()
  );
  const {input, failed} = useStatsPageProps(excludeCategories, duration);
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="w-full max-w-sm">
        <DurationSelector duration={duration} onChange={setDuration} />
      </div>
      <ExcludedCategoriesSelector
        excludedIds={excludeCategories}
        setExcludedIds={setExcludeCategories}
      />
      <CurrencyExchangeFailed failedTransactions={failed} />
      {/* Charts */}
      <MonthlyExpense input={input} />
      <MonthlyExpenseAverage input={input} />
      <YearlyExpense input={input} />
      <MonthlyExpenseByTopCategory input={input} />
      <MonthlyExpenseByCategory input={input} />
      <FanoutByRootCategory input={input} />
    </div>
  );
}

export function ExpensePage({dbData}: {dbData: AllDatabaseData}) {
  if (!isFullyConfigured(dbData)) {
    return <NotConfiguredYet />;
  }
  return (
    <CoreDataContextProvider dbData={dbData}>
      <TransactionDataContextProvider dbData={dbData}>
        <MarketDataContextProvider dbData={dbData}>
          <NonEmptyPageContent />
        </MarketDataContextProvider>
      </TransactionDataContextProvider>
    </CoreDataContextProvider>
  );
}
