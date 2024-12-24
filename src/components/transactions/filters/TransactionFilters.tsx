import {FiltersFormSchema} from '@/components/transactions/filters/FiltersFormSchema';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {useTransactionDataContext} from '@/lib/context/TransactionDataContext';
import {Transaction} from '@/lib/model/transaction/Transaction';
import {
  QuerySyntaxError,
  SearchParams,
  fallbackSearch,
  search,
} from '@/lib/search/search';
import {useFormContext} from 'react-hook-form';

export function useFilteredTransactions(): {
  results: Transaction[];
  error?: QuerySyntaxError;
} {
  const {
    banks,
    bankAccounts,
    categories: allCategories,
    trips,
    tags,
  } = useCoreDataContext();
  const {transactions} = useTransactionDataContext();
  const {watch} = useFormContext<FiltersFormSchema>();
  const query = watch('query');
  const searchParams: SearchParams = {
    query,
    transactions,
    banks,
    bankAccounts,
    categories: allCategories,
    trips,
    tags,
  };

  try {
    const results = search(searchParams);
    return {results};
  } catch (e) {
    if (e instanceof QuerySyntaxError) {
      const fallbackResults = fallbackSearch(searchParams);
      return {results: fallbackResults, error: e};
    } else {
      throw e;
    }
  }
}
