import Charts from 'components/charts/interface';
import {useAllDatabaseDataContext} from 'lib/context/AllDatabaseDataContext';
import {useDisplayCurrency} from 'lib/context/DisplaySettingsContext';
import {findRoot, makeCategoryTree, mustFindCategory} from 'lib/model/Category';
import {TransactionsStatsInput} from 'lib/stats/TransactionsStatsInput';
import {currencyAppendMap} from 'lib/util/AppendMap';

export function ExpensesByRootCategory({
  input,
}: {
  input: TransactionsStatsInput;
}) {
  const displayCurrency = useDisplayCurrency();
  const {categories} = useAllDatabaseDataContext();
  const tree = makeCategoryTree(categories);
  const byId = currencyAppendMap<number>(displayCurrency);
  for (const {t, ownShare} of input.expensesExchanged()) {
    const root = findRoot(t.categoryId, tree);
    byId.increment(root.id, ownShare);
  }
  const data = [...byId.entries()].map(([k, v]) => ({
    name: mustFindCategory(k, categories).name,
    amount: v,
  }));
  return (
    <Charts.HorizontalBar
      title="Expenses by root category"
      data={data}
      currency={displayCurrency}
    />
  );
}
