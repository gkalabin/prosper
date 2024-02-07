import {
  ChartsLibrary,
  HorizontalBarProps,
  Props,
} from 'components/charts/interface/Interface';
import ReactEcharts from 'echarts-for-react';
import {formatCurrency} from 'lib/model/Currency';
import {formatInterval, sliceInterval} from 'lib/util/time';

function Bar({series, interval, title}: Props) {
  const currency = series.data.getCurrency();
  const yFormatter = (v: number): string =>
    formatCurrency(currency, v, {maximumFractionDigits: 0});
  const g = series.data.getGranularity();
  const slices = sliceInterval({interval, granularity: g});
  return (
    <ReactEcharts
      notMerge
      option={{
        grid: {
          containLabel: true,
        },
        tooltip: {},
        yAxis: {
          axisLabel: {
            formatter: yFormatter,
          },
        },
        xAxis: {
          data: slices.map(formatInterval),
        },
        title: {
          text: title,
        },
        series: [
          {
            type: 'bar',
            name: title,
            data: slices.map(i => series.data.get(i.start).round().dollar()),
          },
        ],
      }}
    />
  );
}

function Line({series, interval, title}: Props) {
  const currency = series.data.getCurrency();
  const yFormatter = (v: number): string =>
    formatCurrency(currency, v, {maximumFractionDigits: 0});
  const g = series.data.getGranularity();
  const slices = sliceInterval({interval, granularity: g});
  return (
    <ReactEcharts
      notMerge
      option={{
        grid: {
          containLabel: true,
        },
        tooltip: {},
        yAxis: {
          axisLabel: {
            formatter: yFormatter,
          },
        },
        xAxis: {
          data: slices.map(formatInterval),
        },
        title: {
          text: title,
        },
        series: [
          {
            type: 'line',
            name: series,
            data: slices.map(i => series.data.get(i.start).round().dollar()),
          },
        ],
      }}
    />
  );
}

function HorizontalBar({title, currency, data}: HorizontalBarProps) {
  const entries = [...data.entries()].sort(
    ([_k1, v1], [_k2, v2]) => v1.cents() - v2.cents()
  );
  const categories = entries.map(([k, _v]) => k);
  const values = entries.map(([_k, v]) => v.round().dollar());
  const formatter = (v: number): string =>
    formatCurrency(currency, v, {maximumFractionDigits: 0});
  return (
    <ReactEcharts
      notMerge
      option={{
        title: {
          text: title,
        },
        grid: {
          containLabel: true,
        },
        tooltip: {},
        xAxis: {
          type: 'value',
          axisLabel: {
            formatter,
          },
        },
        yAxis: {
          type: 'category',
          data: categories,
        },
        series: [
          {
            type: 'bar',
            name: title,
            data: values,
          },
        ],
      }}
    />
  );
}

const echartsImpl: ChartsLibrary = {Bar, Line, HorizontalBar};
export default echartsImpl;
