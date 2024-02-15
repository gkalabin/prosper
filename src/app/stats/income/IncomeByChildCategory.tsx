'use client';
import Charts from '@/components/charts/interface';
import {NamedTimeseries} from '@/components/charts/interface/Interface';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {getNameWithAncestors, makeCategoryTree} from '@/lib/model/Category';
import {ExchangedTransactions} from '@/lib/ExchangedTransactions';
import {DefaultMap} from '@/lib/util/DefaultMap';
import {Granularity} from '@/lib/util/Granularity';
import {MoneyTimeseries} from '@/lib/util/Timeseries';

export function IncomeByChildCategory({input}: {input: ExchangedTransactions}) {
  const {categories} = useAllDatabaseDataContext();
  const tree = makeCategoryTree(categories);
  const newEmptySeries = () =>
    new MoneyTimeseries(input.currency(), Granularity.MONTHLY);
  const byId = new DefaultMap<number, MoneyTimeseries>(newEmptySeries);
  for (const {t, ownShare} of input.income()) {
    byId.getOrCreate(t.categoryId).increment(t.timestampEpoch, ownShare);
  }
  const data: NamedTimeseries[] = [...byId.entries()].map(
    ([categoryId, series]) => ({
      name: getNameWithAncestors(categoryId, tree),
      series,
    })
  );
  return (
    <Charts.StackedBar
      title="Income by category"
      currency={input.currency()}
      granularity={Granularity.MONTHLY}
      interval={input.interval()}
      data={data}
    />
  );
}
