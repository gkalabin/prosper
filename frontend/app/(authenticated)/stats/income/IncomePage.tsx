'use client';
import {AppDataContextProviders} from '@/lib/context/AppDataContextProviders';
import {CurrencyExchangeFailed} from '@/app/(authenticated)/stats/CurrencyExchangeFailed';
import {ExcludedCategoriesSelector} from '@/app/(authenticated)/stats/ExcludedCategoriesSelector';
import {useStatsPageProps} from '@/app/(authenticated)/stats/modelHelpers';
import {DurationSelector, getLast6Months} from '@/components/DurationSelector';
import {
  NotConfiguredYet,
  isFullyConfigured,
} from '@/components/NotConfiguredYet';
import {MonthlyIncome} from '@/components/charts/timeseries/MonthlyIncome';
import {MonthlyIncomeAverage} from '@/components/charts/timeseries/MonthlyIncomeAverage';
import {MonthlyIncomeByCategory} from '@/components/charts/timeseries/MonthlyIncomeByCategory';
import {YearlyIncome} from '@/components/charts/timeseries/YearlyIncome';
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
      <div className="w-full max-w-sm">
        <DurationSelector duration={duration} onChange={setDuration} />
      </div>
      <ExcludedCategoriesSelector
        excludedIds={excludeCategories}
        setExcludedIds={setExcludeCategories}
      />
      <CurrencyExchangeFailed failedTransactions={failed} />
      <MonthlyIncome input={input} />
      <MonthlyIncomeAverage input={input} />
      <YearlyIncome input={input} />
      <MonthlyIncomeByCategory input={input} />
    </div>
  );
}

export function IncomePage({dbData}: {dbData: AppData}) {
  if (!isFullyConfigured(dbData)) {
    return <NotConfiguredYet />;
  }
  return (
    <AppDataContextProviders dbData={dbData}>
      <NonEmptyPageContent />
    </AppDataContextProviders>
  );
}
