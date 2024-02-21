import {Charts} from '@/components/charts/interface';
import {ExchangedExpense, ExchangedIncome} from '@/lib/ExchangedTransactions';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {
  findRoot,
  makeCategoryTree,
  mustFindCategory,
} from '@/lib/model/Category';
import {Currency} from '@/lib/model/Currency';
import {currencyAppendMap} from '@/lib/util/AppendMap';

type RootCategoryBreakdownChartProps = {
  title: string;
  currency: Currency;
  data: Array<ExchangedIncome | ExchangedExpense>;
};

export function RootCategoryBreakdownChart({
  title,
  currency,
  data,
}: RootCategoryBreakdownChartProps) {
  const {categories} = useAllDatabaseDataContext();
  const tree = makeCategoryTree(categories);
  const byId = currencyAppendMap<number>(currency);
  for (const {t, ownShare} of data) {
    const root = findRoot(t.categoryId, tree);
    byId.increment(root.id, ownShare);
  }
  const categoryData = [...byId.entries()]
    .map(([k, v]) => ({
      name: mustFindCategory(k, categories).name,
      amount: v,
    }))
    .sort((a, b) => a.amount.cents() - b.amount.cents());
  return (
    <Charts.HorizontalBar
      title={title}
      data={categoryData}
      currency={currency}
    />
  );
}
