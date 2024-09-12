'use client';
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
import {AllDatabaseDataContextProvider} from '@/lib/context/AllDatabaseDataContext';
import {AllDatabaseData} from '@/lib/model/AllDatabaseDataModel';
import {ChartPieIcon, FunnelIcon} from '@heroicons/react/24/outline';
import {Formik} from 'formik';
import {useState} from 'react';

function NonEmptyPageContent() {
  const [showFiltersForm, setShowFiltersForm] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const {results: filteredTransactions, error} = useFilteredTransactions();
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
      <TransactionsList transactions={filteredTransactions} />
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
