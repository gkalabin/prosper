'use client';
import {Charts} from '@/components/charts';
import {ExchangedTransactions} from '@/lib/ExchangedTransactions';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {getNameWithAncestors, makeCategoryTree} from '@/lib/model/Category';
import {transactionCategory} from '@/lib/model/transaction/Transaction';
import {currencyAppendMap} from '@/lib/util/AppendMap';

export function ExpenseByCategory({input}: {input: ExchangedTransactions}) {
  const {categories} = useCoreDataContext();
  const tree = makeCategoryTree(categories);
  const byId = currencyAppendMap<number>(input.currency());
  for (const {t, ownShare} of input.expenses()) {
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
      title="Expenses by category"
      data={data}
      currency={input.currency()}
    />
  );
}
