'use client';
import {AppDataContextProviders} from '@/lib/context/AppDataContextProviders';
import {CurrencyExchangeFailed} from '@/app/(authenticated)/stats/CurrencyExchangeFailed';
import {ExcludedCategoriesSelector} from '@/app/(authenticated)/stats/ExcludedCategoriesSelector';
import {FanoutByRootCategory} from '@/app/(authenticated)/stats/expense/FanoutByRootCategory';
import {useStatsPageProps} from '@/app/(authenticated)/stats/modelHelpers';
import {DurationSelector, getLast6Months} from '@/components/DurationSelector';
import {
  NotConfiguredYet,
  isFullyConfigured,
} from '@/components/NotConfiguredYet';
import {MonthlyExpense} from '@/components/charts/timeseries/MonthlyExpense';
import {MonthlyExpenseAverage} from '@/components/charts/timeseries/MonthlyExpenseAverage';
import {MonthlyExpenseByCategory} from '@/components/charts/timeseries/MonthlyExpenseByCategory';
import {MonthlyExpenseByTopCategory} from '@/components/charts/timeseries/MonthlyExpenseByTopCategory';
import {YearlyExpense} from '@/components/charts/timeseries/YearlyExpense';
import {useDisplaySettingsContext} from '@/lib/context/DisplaySettingsContext';
import {AppData} from '@/lib/model/AppDataModel';
import {useState} from 'react';

function NonEmptyPageContent() {
  const [duration, setDuration] = useState(getLast6Months());
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

export function ExpensePage({dbData}: {dbData: AppData}) {
  if (!isFullyConfigured(dbData)) {
    return <NotConfiguredYet />;
  }
  return (
    <AppDataContextProviders dbData={dbData}>
      <NonEmptyPageContent />
    </AppDataContextProviders>
  );
}
