'use client';
import {categoryNameById} from '@/app/stats/modelHelpers';
import Charts from '@/components/charts/interface';
import {NamedTimeseries} from '@/components/charts/interface/Interface';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {useDisplayCurrency} from '@/lib/context/DisplaySettingsContext';
import {findRoot, makeCategoryTree} from '@/lib/model/Category';
import {transactionCategory} from '@/lib/model/transaction/Transaction';
import {TransactionsStatsInput} from '@/lib/stats/TransactionsStatsInput';
import {DefaultMap} from '@/lib/util/DefaultMap';
import {Granularity} from '@/lib/util/Granularity';
import {MoneyTimeseries} from '@/lib/util/Timeseries';

export function ExpensesByRootCategory({
  input,
}: {
  input: TransactionsStatsInput;
}) {
  const displayCurrency = useDisplayCurrency();
  const {categories} = useAllDatabaseDataContext();
  const categoryTree = makeCategoryTree(categories);
  const newEmptySeries = () =>
    new MoneyTimeseries(displayCurrency, Granularity.MONTHLY);
  const byId = new DefaultMap<number, MoneyTimeseries>(newEmptySeries);
  for (const {t, ownShare} of input.expensesExchanged()) {
    const category = transactionCategory(t, categories);
    const root = findRoot(category, categoryTree).id;
    byId.getOrCreate(root).increment(t.timestampEpoch, ownShare);
  }
  const data: NamedTimeseries[] = [...byId.entries()].map(
    ([categoryId, series]) => ({
      name: categoryNameById(categoryId, categories),
      series,
    })
  );
  return (
    <Charts.StackedBar
      title="By root category"
      currency={displayCurrency}
      granularity={Granularity.MONTHLY}
      interval={input.interval()}
      data={data}
    />
  );
}
