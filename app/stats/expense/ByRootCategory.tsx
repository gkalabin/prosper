'use client';
import {categoryNameById, dollarsRounded} from 'app/stats/modelHelpers';
import {startOfMonth} from 'date-fns';
import ReactEcharts from 'echarts-for-react';
import {
  defaultMonthlyMoneyChart,
  legend,
  stackedBarChartTooltip,
} from 'lib/charts';
import {useAllDatabaseDataContext} from 'lib/context/AllDatabaseDataContext';
import {useDisplayCurrency} from 'lib/context/DisplaySettingsContext';
import {findRoot, makeCategoryTree} from 'lib/model/Category';
import {transactionCategory} from 'lib/model/transaction/Transaction';
import {TransactionsStatsInput} from 'lib/stats/TransactionsStatsInput';
import {DefaultMap} from 'lib/util/DefaultMap';
import {Granularity, MoneyTimeseries} from 'lib/util/Timeseries';

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
  const data = new DefaultMap<number, MoneyTimeseries>(newEmptySeries);
  for (const {t, ownShare} of input.expensesExchanged()) {
    const ts = startOfMonth(t.timestampEpoch).getTime();
    const category = transactionCategory(t, categories);
    const rootId = findRoot(category, categoryTree).id;
    data.getOrCreate(rootId).increment(ts, ownShare);
  }
  return (
    <ReactEcharts
      notMerge
      option={{
        ...defaultMonthlyMoneyChart(displayCurrency, input.interval()),
        ...stackedBarChartTooltip(displayCurrency),
        ...legend(),
        title: {
          text: 'By root category',
        },
        series: [...data.entries()].map(([categoryId, series]) => ({
          type: 'bar',
          stack: 'moneyIn',
          name: categoryNameById(categoryId, categories),
          data: input.months().map(m => dollarsRounded(series.get(m))),
        })),
      }}
    />
  );
}
