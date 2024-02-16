'use client';
import {CurrencyExchangeFailed} from '@/app/stats/CurrencyExchangeFailed';
import {ExcludedCategoriesSelector} from '@/app/stats/ExcludedCategoriesSelector';
import {useStatsPageProps} from '@/app/stats/modelHelpers';
import {ExpenseByChildCategory} from '@/app/stats/quarterly/ExpenseByChildCategory';
import {ExpensesByRootCategory} from '@/app/stats/quarterly/ExpensesByRootCategory';
import {IncomeByChildCategory} from '@/app/stats/quarterly/IncomeByChildCategory';
import {Navigation} from '@/app/stats/quarterly/Navigation';
import {PeriodSummary} from '@/app/stats/quarterly/PeriodSummary';
import {TopVendorsBySpend} from '@/app/stats/quarterly/TopVendorsBySpend';
import {TopVendorsByTransactionCount} from '@/app/stats/quarterly/TopVendorsByTransactionCount';
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
import {Interval, endOfQuarter, startOfQuarter} from 'date-fns';
import {useState} from 'react';

export function QuarterlyStats({input}: {input: TransactionsStatsInput}) {
  return (
    <div className="space-y-4">
      <PeriodSummary input={input} />
      <div>
        <h1 className="text-xl font-medium leading-7">
          Expenses ({input.expensesExchanged().length})
        </h1>
        <ExpensesByRootCategory input={input} />
        <ExpenseByChildCategory input={input} />
        <SortableTransactionsList
          transactions={input.expensesExchanged().map(({t}) => t)}
          initialSorting={SortingMode.AMOUNT_DESC}
        />
      </div>
      <div>
        <h1 className="text-xl font-medium leading-7">
          Income ({input.incomeExchanged().length})
        </h1>
        <IncomeByChildCategory input={input} />
        <SortableTransactionsList
          transactions={input.incomeExchanged().map(({t}) => t)}
          initialSorting={SortingMode.AMOUNT_DESC}
        />
      </div>
      <div>
        <h1 className="text-xl font-medium leading-7">Vendors</h1>
        <TopVendorsBySpend input={input} />
        <TopVendorsByTransactionCount input={input} />
      </div>
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
  const [quarter, setQuarter] = useState<Interval>({
    start: startOfQuarter(now),
    end: endOfQuarter(now),
  });
  const {input, failed} = useStatsPageProps(excludeCategories, quarter);
  return (
    <div className="space-y-4">
      <ExcludedCategoriesSelector
        excludedIds={excludeCategories}
        setExcludedIds={setExcludeCategories}
      />
      <Navigation
        timeline={allDataInterval}
        selected={quarter}
        setSelected={setQuarter}
        granularity={Granularity.QUARTERLY}
      />
      <CurrencyExchangeFailed failedTransactions={failed} />
      <QuarterlyStats input={input} />
    </div>
  );
}

export function QuarterlyStatsPage({dbData}: {dbData: AllDatabaseData}) {
  if (!isFullyConfigured(dbData)) {
    return <NotConfiguredYet />;
  }
  return (
    <AllDatabaseDataContextProvider dbData={dbData}>
      <NonEmptyPageContent />
    </AllDatabaseDataContextProvider>
  );
}