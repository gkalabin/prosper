'use client';
import {CurrencyExchangeFailed} from '@/app/stats/CurrencyExchangeFailed';
import {ExcludedCategoriesSelector} from '@/app/stats/ExcludedCategoriesSelector';
import {MonthlyAverageCashflow} from '@/components/charts/MonthlyAverageCashflow';
import {MonthlyCashflow} from '@/components/charts/MonthlyCashflow';
import {MonthlyCumulativeCashflow} from '@/components/charts/MonthlyCumulativeCashflow';
import {YearlyCashflow} from '@/components/charts/YearlyCashflow';
import {YearlyCumulativeCashflow} from '@/components/charts/YearlyCumulativeCashflow';
import {MonthlySpend} from '@/components/charts/MonthlySpend';
import {YearlySpend} from '@/components/charts/YearlySpend';
import {MonthlyIncome} from '@/components/charts/MonthlyIncome';
import {YearlyIncome} from '@/components/charts/YearlyIncome';
import {useStatsPageProps} from '@/app/stats/modelHelpers';
import {DurationSelector, LAST_6_MONTHS} from '@/components/DurationSelector';
import {
  NotConfiguredYet,
  isFullyConfigured,
} from '@/components/NotConfiguredYet';
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
      <div className="w-full max-w-sm">
        <DurationSelector duration={duration} onChange={setDuration} />
      </div>
      <ExcludedCategoriesSelector
        excludedIds={excludeCategories}
        setExcludedIds={setExcludeCategories}
      />
      <CurrencyExchangeFailed failedTransactions={failed} />
      <MonthlyCashflow input={input} />
      <MonthlyCumulativeCashflow input={input} />
      <MonthlyAverageCashflow input={input} />
      <MonthlySpend input={input} />
      <MonthlyIncome input={input} />
      <YearlyCashflow input={input} />
      <YearlyCumulativeCashflow input={input} />
      <YearlySpend input={input} />
      <YearlyIncome input={input} />
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
