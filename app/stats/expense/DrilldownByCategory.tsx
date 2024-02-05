'use client';
import {categoryNameById, dollarsRounded} from 'app/stats/modelHelpers';
import ReactEcharts from 'echarts-for-react';
import {defaultMonthlyMoneyChart, stackedBarChartTooltip} from 'lib/charts';
import {useAllDatabaseDataContext} from 'lib/context/AllDatabaseDataContext';
import {useDisplayCurrency} from 'lib/context/DisplaySettingsContext';
import {
  Category,
  isRoot,
  makeCategoryTree,
  subtreeIncludes,
} from 'lib/model/Category';
import {TransactionsStatsInput} from 'lib/stats/TransactionsStatsInput';
import {DefaultMap} from 'lib/util/DefaultMap';
import {Granularity, MoneyTimeseries} from 'lib/util/Timeseries';

export function ByCategoryCharts({input}: {input: TransactionsStatsInput}) {
  const {categories} = useAllDatabaseDataContext();
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
  input: TransactionsStatsInput;
  root: Category;
}) {
  const displayCurrency = useDisplayCurrency();
  const {categories} = useAllDatabaseDataContext();
  const categoryTree = makeCategoryTree(categories);
  const newEmptySeries = () =>
    new MoneyTimeseries(displayCurrency, Granularity.MONTHLY);
  const data = new DefaultMap<number, MoneyTimeseries>(newEmptySeries);
  for (const {t, ownShare} of input.expensesExchanged()) {
    if (!subtreeIncludes(root, t.categoryId, categoryTree)) {
      continue;
    }
    data.getOrCreate(t.categoryId).increment(t.timestampEpoch, ownShare);
  }
  if (data.size == 0) {
    return <></>;
  }
  return (
    <>
      <ReactEcharts
        notMerge
        option={{
          ...defaultMonthlyMoneyChart(displayCurrency, input.interval()),
          ...stackedBarChartTooltip(displayCurrency),
          title: {
            text: categoryNameById(root.id, categories),
          },
          series: [...data.entries()].map(([categoryId, series]) => ({
            type: 'bar',
            stack: 'moneyOut',
            name: categoryNameById(categoryId, categories),
            data: input.months().map(m => dollarsRounded(series.get(m))),
          })),
        }}
      />
    </>
  );
}
