import Charts from 'components/charts/interface';
import {useAllDatabaseDataContext} from 'lib/context/AllDatabaseDataContext';
import {useDisplayCurrency} from 'lib/context/DisplaySettingsContext';
import {findRoot, makeCategoryTree} from 'lib/model/Category';
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
  const data = currencyAppendMap<string>(displayCurrency);
  for (const {t, ownShare} of input.expensesExchanged()) {
    const root = findRoot(t.categoryId, tree);
    data.increment(root.name, ownShare);
  }
  return (
    <Charts.HorizontalBar
      title="Expenses by root category"
      data={data}
      currency={displayCurrency}
    />
  );
}
