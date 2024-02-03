import {ChartsLibrary, Props} from 'components/charts/interface/Interface';
import ReactEcharts from 'echarts-for-react';
import {formatCurrency} from 'lib/model/Currency';
import {formatPoint, intervalPoints} from './util';

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

const echartsImpl: ChartsLibrary = {Bar, Line};
export default echartsImpl;
