'use client';
import {
  NotConfiguredYet,
  isFullyConfigured,
} from '@/components/NotConfiguredYet';
import {
  FiltersFormSchema,
  filtersFormValidationSchema,
} from '@/components/transactions/filters/FiltersFormSchema';
import {useFilteredTransactions} from '@/components/transactions/filters/TransactionFilters';
import {
  SearchForAnythingInput,
  TransactionFiltersForm,
} from '@/components/transactions/filters/TransactionFiltersForm';
import {UpdateQueryOnFormChange} from '@/components/transactions/filters/UpdateQueryOnFormChange';
import {TransactionsList} from '@/components/transactions/TransactionsList';
import {TransactionStats} from '@/components/transactions/TransactionStats';
import {Button} from '@/components/ui/button';
import {Form} from '@/components/ui/form';
import {CoreDataContextProvider} from '@/lib/context/CoreDataContext';
import {MarketDataContextProvider} from '@/lib/context/MarketDataContext';
import {TransactionDataContextProvider} from '@/lib/context/TransactionDataContext';
import {AllDatabaseData} from '@/lib/model/AllDatabaseDataModel';
import {ChartPieIcon, FunnelIcon} from '@heroicons/react/24/outline';
import {zodResolver} from '@hookform/resolvers/zod';
import {useState} from 'react';
import {useForm} from 'react-hook-form';

function NonEmptyPageContent() {
  const [showFiltersForm, setShowFiltersForm] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const {results: filteredTransactions, error} = useFilteredTransactions();
  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-4">
        <Button onClick={() => setShowFiltersForm(!showFiltersForm)}>
          <FunnelIcon className="mr-2 inline h-4 w-4" />
          Filters
        </Button>
        <Button onClick={() => setShowStats(!showStats)}>
          <ChartPieIcon className="mr-2 inline h-4 w-4" />
          Stats
        </Button>
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
  const form = useForm<FiltersFormSchema>({
    resolver: zodResolver(filtersFormValidationSchema),
    defaultValues: {
      query: '',
      transactionTypes: [],
      vendor: '',
      timeFrom: '',
      timeTo: '',
      accountIds: [],
      categoryIds: [],
      tripNames: [],
      tagIds: [],
      allTagsShouldMatch: false,
    },
  });
  if (!isFullyConfigured(dbData)) {
    return <NotConfiguredYet />;
  }
  return (
    <Form {...form}>
      <CoreDataContextProvider dbData={dbData}>
        <TransactionDataContextProvider dbData={dbData}>
          <MarketDataContextProvider dbData={dbData}>
            <UpdateQueryOnFormChange />
            <NonEmptyPageContent />
          </MarketDataContextProvider>
        </TransactionDataContextProvider>
      </CoreDataContextProvider>
    </Form>
  );
}
