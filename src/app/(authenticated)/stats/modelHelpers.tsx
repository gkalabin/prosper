import {ExchangedIntervalTransactions} from '@/lib/ExchangedTransactions';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {useDisplayCurrency} from '@/lib/context/DisplaySettingsContext';
import {useMarketDataContext} from '@/lib/context/MarketDataContext';
import {useTransactionDataContext} from '@/lib/context/TransactionDataContext';
import {
  Category,
  getDescendants,
  makeCategoryTree,
  mustFindCategory,
} from '@/lib/model/Category';
import {exchangeTransactionAmounts} from '@/lib/model/queries/ExchangeTransactionAmounts';
import {Expense} from '@/lib/model/transactionNEW/Expense';
import {Income} from '@/lib/model/transactionNEW/Income';
import {Transaction} from '@/lib/model/transactionNEW/Transaction';
import {type Interval} from 'date-fns';

function filterExcludedTransactions(
  allTransactions: (Income | Expense)[],
  excludeCategoryIds: number[],
  all: Category[]
): (Income | Expense)[] {
  const tree = makeCategoryTree(all);
  const direct = excludeCategoryIds.map(cid => mustFindCategory(cid, all));
  const descendants = direct
    .flatMap(c => getDescendants(c, tree))
    .map(c => c.category);
  const allExclusion = [...direct, ...descendants];
  const exclude = new Set<number>(allExclusion.map(c => c.id));
  return allTransactions.filter(t => !exclude.has(t.categorisation.categoryId));
}

export function useStatsPageProps(
  excludeCategories: number[],
  duration: Interval<Date>
): {input: ExchangedIntervalTransactions; failed: Transaction[]} {
  const {categories, stocks} = useCoreDataContext();
  const {transactions} = useTransactionDataContext();
  const {exchange} = useMarketDataContext();
  const displayCurrency = useDisplayCurrency();
  const incomeExpenseTransactions = transactions.filter(
    t => t.kind === 'EXPENSE' || t.kind === 'INCOME'
  );
  const filteredTransactions = filterExcludedTransactions(
    incomeExpenseTransactions,
    excludeCategories,
    categories
  );
  const {exchanged, failed} = exchangeTransactionAmounts({
    transactions: filteredTransactions,
    targetCurrency: displayCurrency,
    stocks,
    exchange,
  });
  return {
    input: new ExchangedIntervalTransactions(
      duration,
      exchanged.transactions(),
      exchanged.currency()
    ),
    failed,
  };
}

export function useExchangedIntervalTransactions(
  transactions: Transaction[],
  duration: Interval<Date>
): {input: ExchangedIntervalTransactions; failed: Transaction[]} {
  const {stocks} = useCoreDataContext();
  const {exchange} = useMarketDataContext();
  const displayCurrency = useDisplayCurrency();
  const incomeExpenseTransactions = transactions.filter(
    t => t.kind === 'EXPENSE' || t.kind === 'INCOME'
  );
  const {exchanged, failed} = exchangeTransactionAmounts({
    transactions: incomeExpenseTransactions,
    targetCurrency: displayCurrency,
    stocks,
    exchange,
  });
  return {
    input: new ExchangedIntervalTransactions(
      duration,
      exchanged.transactions(),
      exchanged.currency()
    ),
    failed,
  };
}
