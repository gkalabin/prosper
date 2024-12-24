'use client';
import {CurrencyExchangeFailed} from '@/app/(authenticated)/stats/CurrencyExchangeFailed';
import {ExcludedCategoriesSelector} from '@/app/(authenticated)/stats/ExcludedCategoriesSelector';
import {useStatsPageProps} from '@/app/(authenticated)/stats/modelHelpers';
import {DurationSelector, LAST_6_MONTHS} from '@/components/DurationSelector';
import {
  NotConfiguredYet,
  isFullyConfigured,
} from '@/components/NotConfiguredYet';
import {MonthlyIncome} from '@/components/charts/timeseries/MonthlyIncome';
import {MonthlyIncomeAverage} from '@/components/charts/timeseries/MonthlyIncomeAverage';
import {MonthlyIncomeByCategory} from '@/components/charts/timeseries/MonthlyIncomeByCategory';
import {YearlyIncome} from '@/components/charts/timeseries/YearlyIncome';
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

export function IncomePage({dbData}: {dbData: AllDatabaseData}) {
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
