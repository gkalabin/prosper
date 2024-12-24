'use client';
import {Charts} from '@/components/charts';
import {NamedTimeseries} from '@/components/charts/ChartsLibrary';
import {ExchangedIntervalTransactions} from '@/lib/ExchangedTransactions';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {
  Category,
  getNameWithAncestors,
  isRoot,
  makeCategoryTree,
  subtreeIncludes,
} from '@/lib/model/Category';
import {DefaultMap} from '@/lib/util/DefaultMap';
import {Granularity} from '@/lib/util/Granularity';
import {MoneyTimeseries} from '@/lib/util/Timeseries';

export function FanoutByRootCategory({
  input,
}: {
  input: ExchangedIntervalTransactions;
}) {
  const {categories} = useCoreDataContext();
  return (
    <>
      <h2 className="my-2 text-2xl font-medium leading-5">
        Drilldown by top-level categories
      </h2>
      {categories
        .filter(c => isRoot(c))
        .map(c => (
          <ExpenseByCategory key={c.id} root={c} input={input} />
        ))}
    </>
  );
}
function ExpenseByCategory({
  input,
  root,
}: {
  input: ExchangedIntervalTransactions;
  root: Category;
}) {
  const {categories} = useCoreDataContext();
  const tree = makeCategoryTree(categories);
  const newEmptySeries = () =>
    new MoneyTimeseries(input.currency(), Granularity.MONTHLY);
  const byId = new DefaultMap<number, MoneyTimeseries>(newEmptySeries);
  for (const {t, ownShare} of input.expenses()) {
    if (!subtreeIncludes(root, t.categoryId, tree)) {
      continue;
    }
    byId.getOrCreate(t.categoryId).increment(t.timestampEpoch, ownShare);
  }
  if (byId.size == 0) {
    return <></>;
  }
  const data: NamedTimeseries[] = [...byId.entries()].map(
    ([categoryId, series]) => ({
      name: getNameWithAncestors(categoryId, tree),
      series,
    })
  );
  return (
    <Charts.StackedBar
      title={getNameWithAncestors(root, tree)}
      currency={input.currency()}
      granularity={Granularity.MONTHLY}
      interval={input.interval()}
      data={data}
    />
  );
}
