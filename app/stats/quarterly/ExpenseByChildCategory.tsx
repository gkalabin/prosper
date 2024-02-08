'use client';
import Charts from 'components/charts/interface';
import {useAllDatabaseDataContext} from 'lib/context/AllDatabaseDataContext';
import {useDisplayCurrency} from 'lib/context/DisplaySettingsContext';
import {getNameWithAncestors, makeCategoryTree} from 'lib/model/Category';
import {transactionCategory} from 'lib/model/transaction/Transaction';
import {TransactionsStatsInput} from 'lib/stats/TransactionsStatsInput';
import {currencyAppendMap} from 'lib/util/AppendMap';

export function ExpenseByChildCategory({
  input,
}: {
  input: TransactionsStatsInput;
}) {
  const displayCurrency = useDisplayCurrency();
  const {categories} = useAllDatabaseDataContext();
  const tree = makeCategoryTree(categories);
  const byId = currencyAppendMap<number>(displayCurrency);
  for (const {t, ownShare} of input.expensesExchanged()) {
    const category = transactionCategory(t, categories);
    byId.increment(category.id, ownShare);
  }
  const data = [...byId.entries()].map(([k, v]) => ({
    name: getNameWithAncestors(k, tree),
    amount: v,
  }));
  return (
    <Charts.HorizontalBar
      title="Expenses by category"
      data={data}
      currency={displayCurrency}
    />
  );
}
