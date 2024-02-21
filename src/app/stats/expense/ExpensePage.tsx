'use client';
import {CurrencyExchangeFailed} from '@/app/stats/CurrencyExchangeFailed';
import {ExcludedCategoriesSelector} from '@/app/stats/ExcludedCategoriesSelector';
import {FanoutByRootCategory} from '@/app/stats/expense/FanoutByRootCategory';
import {useStatsPageProps} from '@/app/stats/modelHelpers';
import {DurationSelector, LAST_6_MONTHS} from '@/components/DurationSelector';
import {
  NotConfiguredYet,
  isFullyConfigured,
} from '@/components/NotConfiguredYet';
import {MonthlySpend} from '@/components/charts/timeseries/MonthlyExpense';
import {AverageMonthlySpend} from '@/components/charts/timeseries/MonthlyExpenseAverage';
import {ExpensesByChildCategory} from '@/components/charts/timeseries/MonthlyExpenseByCategory';
import {ExpensesByRootCategory} from '@/components/charts/timeseries/MonthlyExpenseByTopCategory';
import {YearlySpend} from '@/components/charts/timeseries/YearlyExpense';
import {AllDatabaseDataContextProvider} from '@/lib/context/AllDatabaseDataContext';
import {useDisplaySettingsContext} from '@/lib/context/DisplaySettingsContext';
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
      <MonthlySpend input={input} />
      <AverageMonthlySpend input={input} />
      <YearlySpend input={input} />
      <ExpensesByRootCategory input={input} />
      <ExpensesByChildCategory input={input} />
      <FanoutByRootCategory input={input} />
    </div>
  );
}

export function ExpensePage({dbData}: {dbData: AllDatabaseData}) {
  if (!isFullyConfigured(dbData)) {
    return <NotConfiguredYet />;
  }
  return (
    <AllDatabaseDataContextProvider dbData={dbData}>
      <NonEmptyPageContent />
    </AllDatabaseDataContextProvider>
  );
}
