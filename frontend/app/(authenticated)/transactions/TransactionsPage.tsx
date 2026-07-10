'use client';
import {
  NotConfiguredYet,
  isFullyConfigured,
} from '@/components/NotConfiguredYet';
import {
  FiltersFormSchema,
  filtersFormValidationSchema,
} from '@/components/transactions/filters/FiltersFormSchema';
import {
  SearchForAnythingInput,
  TransactionFiltersForm,
} from '@/components/transactions/filters/TransactionFiltersForm';
import {UpdateQueryOnFormChange} from '@/components/transactions/filters/UpdateQueryOnFormChange';
import {TransactionTimeline} from '@/components/transactions/TransactionTimeline';
import {
  AllTransactionsSummary,
  MatchedTransactionsSummary,
} from '@/components/transactions/TransactionsSummary';
import {TransactionStats} from '@/components/transactions/TransactionStats';
import {
  TransactionsView,
  TransactionsViewToggle,
} from '@/components/transactions/TransactionsViewToggle';
import {Button} from '@/components/ui/button';
import {Form} from '@/components/ui/form';
import {AppDataContextProviders} from '@/lib/context/AppDataContextProviders';
import {useTransactionDataContext} from '@/lib/context/TransactionDataContext';
import {AppData} from '@/lib/model/AppDataModel';
import {useTransactionSearch} from '@/lib/search/useTransactionSearch';
import {FunnelIcon} from '@heroicons/react/24/outline';
import {zodResolver} from '@hookform/resolvers/zod';
import {useState} from 'react';
import {useForm, useFormContext} from 'react-hook-form';

function NonEmptyPageContent() {
  const [showFiltersForm, setShowFiltersForm] = useState(false);
  const [view, setView] = useState<TransactionsView>('list');
  const {transactions} = useTransactionDataContext();
  const {watch} = useFormContext<FiltersFormSchema>();
  const query = watch('query');
  const {results: filteredTransactions, error} = useTransactionSearch(
    transactions,
    query
  );
  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-4">
        <Button onClick={() => setShowFiltersForm(!showFiltersForm)}>
          <FunnelIcon className="mr-2 inline h-4 w-4" />
          Filters
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
      <div className="flex items-center justify-between gap-4">
        {query.trim().length > 0 ? (
          <MatchedTransactionsSummary transactions={filteredTransactions} />
        ) : (
          <AllTransactionsSummary transactions={transactions} />
        )}
        <TransactionsViewToggle view={view} onChange={setView} />
      </div>
      {view === 'stats' ? (
        <TransactionStats transactions={filteredTransactions} />
      ) : (
        <TransactionTimeline transactions={filteredTransactions} />
      )}
    </div>
  );
}

export function TransactionsPage({dbData}: {dbData: AppData}) {
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
      <AppDataContextProviders dbData={dbData}>
        <UpdateQueryOnFormChange />
        <NonEmptyPageContent />
      </AppDataContextProviders>
    </Form>
  );
}
