import {FiltersFormSchema} from '@/components/transactions/filters/FiltersFormSchema';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
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
    transactions,
    banks,
    bankAccounts,
    categories: allCategories,
    trips,
    tags,
  } = useAllDatabaseDataContext();
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
