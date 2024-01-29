import {type Interval, eachYearOfInterval} from 'date-fns';
import ReactEcharts from 'echarts-for-react';
import {defaultYearlyMoneyChart} from 'lib/charts';
import {useDisplayCurrency} from 'lib/context/DisplaySettingsContext';
import {MoneyTimeseries} from 'lib/util/Timeseries';

export function YearlyChart({
  data,
  duration,
  title,
  type,
}: {
  data: MoneyTimeseries;
  duration: Interval;
  title: string;
  type?: 'bar' | 'line';
}) {
  type ??= 'bar';
  const displayCurrency = useDisplayCurrency();
  const years = eachYearOfInterval(duration);
  return (
    <ReactEcharts
      notMerge
      option={{
        ...defaultYearlyMoneyChart(displayCurrency, duration),
        title: {
          text: title,
        },
        series: [
          {
            type,
            name: title,
            data: years.map(m => data.get(m).round().dollar()),
          },
        ],
      }}
    />
  );
}
