'use client';
import {categoryNameById, dollarsRounded} from 'app/stats/modelHelpers';
import ReactEcharts from 'echarts-for-react';
import {defaultMonthlyMoneyChart, stackedBarChartTooltip} from 'lib/charts';
import {useAllDatabaseDataContext} from 'lib/context/AllDatabaseDataContext';
import {useDisplayCurrency} from 'lib/context/DisplaySettingsContext';
import {TransactionsStatsInput} from 'lib/stats/TransactionsStatsInput';
import {DefaultMap} from 'lib/util/DefaultMap';
import {Granularity, MoneyTimeseries} from 'lib/util/Timeseries';

export function ExpensesByChildCategory({
  input,
}: {
  input: TransactionsStatsInput;
}) {
  const displayCurrency = useDisplayCurrency();
  const {categories} = useAllDatabaseDataContext();
  const newEmptySeries = () =>
    new MoneyTimeseries(displayCurrency, Granularity.MONTHLY);
  const data = new DefaultMap<number, MoneyTimeseries>(newEmptySeries);
  for (const {t, ownShare} of input.expensesExchanged()) {
    data.getOrCreate(t.categoryId).increment(t.timestampEpoch, ownShare);
  }
  return (
    <ReactEcharts
      notMerge
      option={{
        ...defaultMonthlyMoneyChart(displayCurrency, input.interval()),
        ...stackedBarChartTooltip(displayCurrency),
        title: {
          text: 'By child category',
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
