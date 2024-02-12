'use client';
import Charts from '@/components/charts/interface';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {getNameWithAncestors, makeCategoryTree} from '@/lib/model/Category';
import {transactionCategory} from '@/lib/model/transaction/Transaction';
import {TransactionsStatsInput} from '@/lib/stats/TransactionsStatsInput';
import {currencyAppendMap} from '@/lib/util/AppendMap';

export function IncomeByChildCategory({
  input,
}: {
  input: TransactionsStatsInput;
}) {
  const {categories} = useAllDatabaseDataContext();
  const tree = makeCategoryTree(categories);
  const byId = currencyAppendMap<number>(input.currency());
  for (const {t, ownShare} of input.incomeExchanged()) {
    const category = transactionCategory(t, categories);
    byId.increment(category.id, ownShare);
  }
  const data = [...byId.entries()]
    .map(([k, v]) => ({
      name: getNameWithAncestors(k, tree),
      amount: v,
    }))
    .sort((a, b) => a.amount.cents() - b.amount.cents());
  return (
    <Charts.HorizontalBar
      title="Income by category"
      data={data}
      currency={input.currency()}
    />
  );
}
