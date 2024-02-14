import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {useDisplayCurrency} from '@/lib/context/DisplaySettingsContext';
import {
  Category,
  getDescendants,
  makeCategoryTree,
  mustFindCategory,
} from '@/lib/model/Category';
import {Transaction} from '@/lib/model/transaction/Transaction';
import {
  amountAllParties,
  amountOwnShare,
} from '@/lib/model/transaction/amounts';
import {
  DisplayCurrencyTransaction,
  TransactionsStatsInput,
} from '@/lib/stats/TransactionsStatsInput';
import {type Interval} from 'date-fns';

function filterExcludedTransactions(
  allTransactions: Transaction[],
  excludeCategoryIds: number[],
  all: Category[]
): Transaction[] {
  const tree = makeCategoryTree(all);
  const direct = excludeCategoryIds.map(cid => mustFindCategory(cid, all));
  const descendants = direct
    .flatMap(c => getDescendants(c, tree))
    .map(c => c.category);
  const allExclusion = [...direct, ...descendants];
  const exclude = new Set<number>(allExclusion.map(c => c.id));
  return allTransactions.filter(t => !exclude.has(t.categoryId));
}

export function useStatsPageProps(
  excludeCategories: number[],
  duration: Interval<Date>
): {input: TransactionsStatsInput; failed: Transaction[]} {
  const {transactions, categories, bankAccounts, stocks, exchange} =
    useAllDatabaseDataContext();
  const displayCurrency = useDisplayCurrency();
  const filteredTransactions = filterExcludedTransactions(
    transactions,
    excludeCategories,
    categories
  );
  const failed: Transaction[] = [];
  const exchanged: DisplayCurrencyTransaction[] = [];
  for (const t of filteredTransactions) {
    if (t.kind == 'Transfer') {
      continue;
    }
    const own = amountOwnShare(
      t,
      displayCurrency,
      bankAccounts,
      stocks,
      exchange
    );
    if (!own) {
      failed.push(t);
      continue;
    }
    const all = amountAllParties(
      t,
      displayCurrency,
      bankAccounts,
      stocks,
      exchange
    );
    if (!all) {
      failed.push(t);
      continue;
    }
    exchanged.push({
      t,
      ownShare: own,
      allParties: all,
    });
  }
  return {
    input: new TransactionsStatsInput(duration, exchanged, displayCurrency),
    failed,
  };
}
