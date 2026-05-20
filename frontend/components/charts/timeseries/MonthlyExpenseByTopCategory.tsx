'use client';
import {Charts} from '@/components/charts';
import {NamedTimeseries} from '@/components/charts/ChartsLibrary';
import {ExchangedIntervalTransactions} from '@/lib/ExchangedTransactions';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {
  findRoot,
  getNameWithAncestors,
  makeCategoryTree,
} from '@/lib/model/Category';
import {transactionCategory} from '@/lib/model/transaction/Transaction';
import {DefaultMap} from '@/lib/util/DefaultMap';
import {Granularity} from '@/lib/util/Granularity';
import {MoneyTimeseries} from '@/lib/util/Timeseries';

export function MonthlyExpenseByTopCategory({
  input,
}: {
  input: ExchangedIntervalTransactions;
}) {
  const {categories} = useCoreDataContext();
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
