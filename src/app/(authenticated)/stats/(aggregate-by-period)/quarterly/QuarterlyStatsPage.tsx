'use client';
import {Navigation} from '@/app/(authenticated)/stats/(aggregate-by-period)/Navigation';
import {PeriodSummary} from '@/app/(authenticated)/stats/(aggregate-by-period)/PeriodSummary';
import {CurrencyExchangeFailed} from '@/app/(authenticated)/stats/CurrencyExchangeFailed';
import {ExcludedCategoriesSelector} from '@/app/(authenticated)/stats/ExcludedCategoriesSelector';
import {useStatsPageProps} from '@/app/(authenticated)/stats/modelHelpers';
import {
  NotConfiguredYet,
  isFullyConfigured,
} from '@/components/NotConfiguredYet';
import {ExpenseByCategory} from '@/components/charts/aggregate/ExpenseByCategory';
import {ExpenseByTopCategoryChart} from '@/components/charts/aggregate/ExpenseByTopCategory';
import {IncomeByCategory} from '@/components/charts/aggregate/IncomeByCategory';
import {VendorsByAmount} from '@/components/charts/aggregate/VendorsByAmount';
import {VendorsByTransactionCount} from '@/components/charts/aggregate/VendorsByTransactionCount';
import {
  SortableTransactionsList,
  SortingMode,
} from '@/components/transactions/SortableTransactionsList';
import {ExchangedIntervalTransactions} from '@/lib/ExchangedTransactions';
import {CoreDataContextProvider} from '@/lib/context/CoreDataContext';
import {useDisplaySettingsContext} from '@/lib/context/DisplaySettingsContext';
import {MarketDataContextProvider} from '@/lib/context/MarketDataContext';
import {
  TransactionDataContextProvider,
  useTransactionDataContext,
} from '@/lib/context/TransactionDataContext';
import {AllDatabaseData} from '@/lib/model/AllDatabaseDataModel';
import {Granularity} from '@/lib/util/Granularity';
import {Interval, endOfQuarter, startOfQuarter} from 'date-fns';
import {useState} from 'react';

export function QuarterlyStats({
  input,
}: {
  input: ExchangedIntervalTransactions;
}) {
  return (
    <div className="space-y-4">
      <PeriodSummary input={input} />
      <div>
        <h1 className="text-xl leading-7 font-medium">
          Expenses ({input.expenses().length})
        </h1>
        <ExpenseByTopCategoryChart
          title={'Expenses by root category'}
          currency={input.currency()}
          data={input.expenses()}
        />
        <ExpenseByCategory input={input} />
        <SortableTransactionsList
          transactions={input.expenses().map(({t}) => t)}
          initialSorting={SortingMode.AMOUNT_DESC}
        />
      </div>
      <div>
        <h1 className="text-xl leading-7 font-medium">
          Income ({input.income().length})
        </h1>
        <IncomeByCategory input={input} />
        <SortableTransactionsList
          transactions={input.income().map(({t}) => t)}
          initialSorting={SortingMode.AMOUNT_DESC}
        />
      </div>
      <div>
        <h1 className="text-xl leading-7 font-medium">Vendors</h1>
        <VendorsByAmount input={input} />
        <VendorsByTransactionCount input={input} />
      </div>
    </div>
  );
}

function NonEmptyPageContent() {
  const {transactions} = useTransactionDataContext();
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
    <CoreDataContextProvider dbData={dbData}>
      <TransactionDataContextProvider dbData={dbData}>
        <MarketDataContextProvider dbData={dbData}>
          <NonEmptyPageContent />
        </MarketDataContextProvider>
      </TransactionDataContextProvider>
    </CoreDataContextProvider>
  );
}
