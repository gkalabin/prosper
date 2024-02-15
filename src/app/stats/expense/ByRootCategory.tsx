'use client';
import Charts from '@/components/charts/interface';
import {NamedTimeseries} from '@/components/charts/interface/Interface';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {
  findRoot,
  getNameWithAncestors,
  makeCategoryTree,
} from '@/lib/model/Category';
import {transactionCategory} from '@/lib/model/transaction/Transaction';
import {ExchangedTransactions} from '@/lib/ExchangedTransactions';
import {DefaultMap} from '@/lib/util/DefaultMap';
import {Granularity} from '@/lib/util/Granularity';
import {MoneyTimeseries} from '@/lib/util/Timeseries';

export function ExpensesByRootCategory({
  input,
}: {
  input: ExchangedTransactions;
}) {
  const {categories} = useAllDatabaseDataContext();
  const categoryTree = makeCategoryTree(categories);
  const newEmptySeries = () =>
    new MoneyTimeseries(input.currency(), Granularity.MONTHLY);
  const byId = new DefaultMap<number, MoneyTimeseries>(newEmptySeries);
  for (const {t, ownShare} of input.expenses()) {
    const category = transactionCategory(t, categories);
    const root = findRoot(category, categoryTree).id;
    byId.getOrCreate(root).increment(t.timestampEpoch, ownShare);
  }
  const data: NamedTimeseries[] = [...byId.entries()].map(
    ([categoryId, series]) => ({
      name: getNameWithAncestors(categoryId, categoryTree),
      series,
    })
  );
  return (
    <Charts.StackedBar
      title="By root category"
      currency={input.currency()}
      granularity={Granularity.MONTHLY}
      interval={input.interval()}
      data={data}
    />
  );
}
