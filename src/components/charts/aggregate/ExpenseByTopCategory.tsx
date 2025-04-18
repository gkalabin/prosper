import {Charts} from '@/components/charts';
import {ExchangedExpense, ExchangedIncome} from '@/lib/ExchangedTransactions';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {
  findRoot,
  makeCategoryTree,
  mustFindCategory,
} from '@/lib/model/Category';
import {Currency} from '@/lib/model/Currency';
import {currencyAppendMap} from '@/lib/util/AppendMap';

type ExpenseByTopCategoryChartProps = {
  title: string;
  currency: Currency;
  data: Array<ExchangedIncome | ExchangedExpense>;
};

export function ExpenseByTopCategoryChart({
  title,
  currency,
  data,
}: ExpenseByTopCategoryChartProps) {
  const {categories} = useCoreDataContext();
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
