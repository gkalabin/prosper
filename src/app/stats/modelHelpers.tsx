import {type Interval} from 'date-fns';
import {AmountWithCurrency} from '@/lib/AmountWithCurrency';
import {StockAndCurrencyExchange} from '@/lib/ClientSideModel';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {useDisplayCurrency} from '@/lib/context/DisplaySettingsContext';
import {BankAccount} from '@/lib/model/BankAccount';
import {
  Category,
  getDescendants,
  getNameWithAncestors,
  makeCategoryTree,
  mustFindCategory,
} from '@/lib/model/Category';
import {Currency} from '@/lib/model/Currency';
import {Stock} from '@/lib/model/Stock';
import {Income} from '@/lib/model/transaction/Income';
import {Expense, Transaction} from '@/lib/model/transaction/Transaction';
import {
  amountAllParties,
  amountOwnShare,
} from '@/lib/model/transaction/amounts';
import {
  DisplayCurrencyTransaction,
  TransactionsStatsInput,
} from '@/lib/stats/TransactionsStatsInput';

export function dollarsRounded(amount: AmountWithCurrency | undefined): number {
  if (!amount) {
    return 0;
  }
  return Math.round(amount.dollar());
}

export function filterExcludedTransactions(
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

export function categoryNameById(
  categoryId: number,
  categories: Category[]
): string {
  const tree = makeCategoryTree(categories);
  return getNameWithAncestors(categoryId, tree);
}

export function ownShareSum(
  transactions: (Income | Expense)[],
  failedToExchange: Transaction[],
  displayCurrency: Currency,
  bankAccounts: BankAccount[],
  stocks: Stock[],
  exchange: StockAndCurrencyExchange
): AmountWithCurrency {
  let sum = AmountWithCurrency.zero(displayCurrency);
  for (const t of transactions) {
    const exchanged = amountOwnShare(
      t,
      displayCurrency,
      bankAccounts,
      stocks,
      exchange
    );
    if (!exchanged) {
      failedToExchange.push(t);
      continue;
    }
    sum = sum.add(exchanged);
  }
  return sum;
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
    input: new TransactionsStatsInput(
      filteredTransactions,
      duration,
      exchanged
    ),
    failed,
  };
}
