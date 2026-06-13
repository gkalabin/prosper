import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {Transaction} from '@/lib/model/transaction/Transaction';
import {
  QuerySyntaxError,
  SearchParams,
  fallbackSearch,
  search,
} from '@/lib/search/search';

// Filters the given transactions by the query, degrading to a free-text match
// when the structured query fails to parse and surfacing the syntax error.
export function useTransactionSearch(
  transactions: Transaction[],
  query: string
): {results: Transaction[]; error?: QuerySyntaxError} {
  const {banks, bankAccounts, categories, trips, tags} = useCoreDataContext();
  const params: SearchParams = {
    query,
    transactions,
    banks,
    bankAccounts,
    categories,
    trips,
    tags,
  };
  try {
    return {results: search(params)};
  } catch (e) {
    if (e instanceof QuerySyntaxError) {
      return {results: fallbackSearch(params), error: e};
    }
    throw e;
  }
}
