import Charts from '@/components/charts/interface';
import {ExchangedIntervalTransactions} from '@/lib/ExchangedTransactions';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {
  findRoot,
  makeCategoryTree,
  mustFindCategory,
} from '@/lib/model/Category';
import {currencyAppendMap} from '@/lib/util/AppendMap';

export function ExpensesByRootCategory({
  input,
}: {
  input: ExchangedIntervalTransactions;
}) {
  const {categories} = useAllDatabaseDataContext();
  const tree = makeCategoryTree(categories);
  const byId = currencyAppendMap<number>(input.currency());
  for (const {t, ownShare} of input.expenses()) {
    const root = findRoot(t.categoryId, tree);
    byId.increment(root.id, ownShare);
  }
  const data = [...byId.entries()]
    .map(([k, v]) => ({
      name: mustFindCategory(k, categories).name,
      amount: v,
    }))
    .sort((a, b) => a.amount.cents() - b.amount.cents());
  return (
    <Charts.HorizontalBar
      title="Expenses by root category"
      data={data}
      currency={input.currency()}
    />
  );
}
