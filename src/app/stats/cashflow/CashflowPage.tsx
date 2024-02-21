'use client';
import {CurrencyExchangeFailed} from '@/app/stats/CurrencyExchangeFailed';
import {ExcludedCategoriesSelector} from '@/app/stats/ExcludedCategoriesSelector';
import {useStatsPageProps} from '@/app/stats/modelHelpers';
import {DurationSelector, LAST_6_MONTHS} from '@/components/DurationSelector';
import {
  NotConfiguredYet,
  isFullyConfigured,
} from '@/components/NotConfiguredYet';
import {MonthlyCashflow} from '@/components/charts/timeseries/MonthlyCashflow';
import {MonthlyCashflowAverage} from '@/components/charts/timeseries/MonthlyCashflowAverage';
import {MonthlyCashflowCumulative} from '@/components/charts/timeseries/MonthlyCashflowCumulative';
import {MonthlyExpense} from '@/components/charts/timeseries/MonthlyExpense';
import {MonthlyIncome} from '@/components/charts/timeseries/MonthlyIncome';
import {YearlyCashflow} from '@/components/charts/timeseries/YearlyCashflow';
import {YearlyCashflowCumulative} from '@/components/charts/timeseries/YearlyCashflowCumulative';
import {YearlyExpense} from '@/components/charts/timeseries/YearlyExpense';
import {YearlyIncome} from '@/components/charts/timeseries/YearlyIncome';
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
      <MonthlyCashflowCumulative input={input} />
      <MonthlyCashflowAverage input={input} />
      <MonthlyExpense input={input} />
      <MonthlyIncome input={input} />
      <YearlyCashflow input={input} />
      <YearlyCashflowCumulative input={input} />
      <YearlyExpense input={input} />
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
