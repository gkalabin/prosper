import {
  ChartsLibrary,
  HorizontalBarProps,
  Props,
} from 'components/charts/interface/Interface';
import {formatPoint, intervalPoints} from 'components/charts/interface/util';
import ReactEcharts from 'echarts-for-react';
import {formatCurrency} from 'lib/model/Currency';

function Bar({series, interval, title}: Props) {
  const currency = series.data.getCurrency();
  const yFormatter = (v: number): string =>
    formatCurrency(currency, v, {maximumFractionDigits: 0});
  const g = series.data.getGranularity();
  const xAxis = intervalPoints(interval, g);
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
          data: xAxis.map(x => formatPoint(x, g)),
        },
        title: {
          text: title,
        },
        series: [
          {
            type: 'bar',
            name: title,
            data: xAxis.map(p => series.data.get(p).round().dollar()),
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
  const xAxis = intervalPoints(interval, g);
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
          data: xAxis.map(x => formatPoint(x, g)),
        },
        title: {
          text: title,
        },
        series: [
          {
            type: 'line',
            name: series,
            data: xAxis.map(p => series.data.get(p).round().dollar()),
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
