'use client';
import {ChartPieIcon, FunnelIcon} from '@heroicons/react/24/outline';
import {
  NotConfiguredYet,
  isFullyConfigured,
} from '@/components/NotConfiguredYet';
import {
  SearchForAnythingInput,
  TransactionFiltersForm,
  initialTransactionFilters,
  useFilteredTransactions,
} from '@/components/transactions/TransactionFilters';
import {TransactionStats} from '@/components/transactions/TransactionStats';
import {TransactionsList} from '@/components/transactions/TransactionsList';
import {ButtonPagePrimary} from '@/components/ui/buttons';
import {Formik} from 'formik';
import {
  AllDatabaseDataContextProvider,
  useAllDatabaseDataContext,
} from '@/lib/context/AllDatabaseDataContext';
import {AllDatabaseData} from '@/lib/model/AllDatabaseDataModel';
import {onTransactionChange} from '@/lib/stateHelpers';
import {useState} from 'react';

function NonEmptyPageContent() {
  const [showFiltersForm, setShowFiltersForm] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const {results: filteredTransactions, error} = useFilteredTransactions();
  const {setDbData} = useAllDatabaseDataContext();
  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-4">
        <ButtonPagePrimary onClick={() => setShowFiltersForm(!showFiltersForm)}>
          <FunnelIcon className="mr-2 inline h-4 w-4" />
          Filters
        </ButtonPagePrimary>
        <ButtonPagePrimary onClick={() => setShowStats(!showStats)}>
          <ChartPieIcon className="mr-2 inline h-4 w-4" />
          Stats
        </ButtonPagePrimary>
      </div>
      {showFiltersForm && (
        <TransactionFiltersForm onClose={() => setShowFiltersForm(false)} />
      )}
      <div className="w-full">
        <SearchForAnythingInput />
        {error && (
          <div className="text-red-500">
            {error.message}:
            {error.getErrors().map(e => (
              <div key={e} className="ml-2">
                {e}
              </div>
            ))}
          </div>
        )}
      </div>
      {showStats && (
        <TransactionStats
          transactions={filteredTransactions}
          onClose={() => setShowStats(false)}
        />
      )}
      <TransactionsList
        transactions={filteredTransactions}
        onTransactionUpdated={onTransactionChange(setDbData)}
      />
    </div>
  );
}

export function TransactionsPage({dbData}: {dbData: AllDatabaseData}) {
  if (!isFullyConfigured(dbData)) {
    return <NotConfiguredYet />;
  }
  return (
    <AllDatabaseDataContextProvider dbData={dbData}>
      <Formik onSubmit={() => {}} initialValues={initialTransactionFilters}>
        <NonEmptyPageContent />
      </Formik>
    </AllDatabaseDataContextProvider>
  );
}
