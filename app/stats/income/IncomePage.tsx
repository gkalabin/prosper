'use client';
import {CurrencyExchangeFailed} from 'app/stats/CurrencyExchangeFailed';
import {ExcludedCategoriesSelector} from 'app/stats/ExcludedCategoriesSelector';
import {AverageMonthlyIncome} from 'app/stats/income/AverageMonthlyIncome';
import {IncomeByCategory} from 'app/stats/income/IncomeByCategory';
import {MonthlyIncome} from 'app/stats/income/MonthlyIncome';
import {YearlyIncome} from 'app/stats/income/YearlyIncome';
import {useStatsPageProps} from 'app/stats/modelHelpers';
import {DurationSelector, LAST_6_MONTHS} from 'components/DurationSelector';
import {NotConfiguredYet, isFullyConfigured} from 'components/NotConfiguredYet';
import {AllDatabaseDataContextProvider} from 'lib/context/AllDatabaseDataContext';
import {useDisplaySettingsContext} from 'lib/context/DisplaySettingsContext';
import {AllDatabaseData} from 'lib/model/AllDatabaseDataModel';
import {useState} from 'react';

function NonEmptyPageContent() {
  const [duration, setDuration] = useState(LAST_6_MONTHS);
  const {displaySettings} = useDisplaySettingsContext();
  const [excludeCategories, setExcludeCategories] = useState(
    displaySettings.excludeCategoryIdsInStats()
  );
  const {input, failedToExchange} = useStatsPageProps(
    excludeCategories,
    duration
  );
  return (
    <div className="space-y-4">
      <div className="w-full max-w-sm">
        <DurationSelector duration={duration} onChange={setDuration} />
      </div>
      <ExcludedCategoriesSelector
        excludedIds={excludeCategories}
        setExcludedIds={setExcludeCategories}
      />
      <CurrencyExchangeFailed failedTransactions={failedToExchange} />
      <MonthlyIncome input={input} />
      <AverageMonthlyIncome input={input} />
      <YearlyIncome input={input} />
      <IncomeByCategory input={input} />
    </div>
  );
}

export function IncomePage({dbData}: {dbData: AllDatabaseData}) {
  if (!isFullyConfigured(dbData)) {
    return <NotConfiguredYet />;
  }
  return (
    <AllDatabaseDataContextProvider dbData={dbData}>
      <NonEmptyPageContent />
    </AllDatabaseDataContextProvider>
  );
}
