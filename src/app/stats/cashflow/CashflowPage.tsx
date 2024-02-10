'use client';
import {CurrencyExchangeFailed} from '@/app/stats/CurrencyExchangeFailed';
import {ExcludedCategoriesSelector} from '@/app/stats/ExcludedCategoriesSelector';
import {MonthlyAverageCashflow} from '@/app/stats/cashflow/MonthlyAverageCashflow';
import {MonthlyCashflow} from '@/app/stats/cashflow/MonthlyCashflow';
import {MonthlyCumulativeCashflow} from '@/app/stats/cashflow/MonthlyCumulativeCashflow';
import {YearlyCashflow} from '@/app/stats/cashflow/YearlyCashflow';
import {YearlyCumulativeCashflow} from '@/app/stats/cashflow/YearlyCumulativeCashflow';
import {MonthlySpend} from '@/app/stats/expense/MonthlySpend';
import {YearlySpend} from '@/app/stats/expense/YearlySpend';
import {MonthlyIncome} from '@/app/stats/income/MonthlyIncome';
import {YearlyIncome} from '@/app/stats/income/YearlyIncome';
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
