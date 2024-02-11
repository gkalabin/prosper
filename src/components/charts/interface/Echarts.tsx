import {
  ChartsLibrary,
  HorizontalBarProps,
  StackedBarProps,
  TimeseriesProps,
} from '@/components/charts/interface/Interface';
import {Currency, formatCurrency} from '@/lib/model/Currency';
import {formatInterval, sliceInterval} from '@/lib/util/time';
import {type EChartsOption} from 'echarts';
import ReactEcharts from 'echarts-for-react';
import {type TooltipComponentOption} from 'echarts/components';
import {CallbackDataParams} from 'echarts/types/dist/shared';

function Bar({title, interval, granularity, data}: TimeseriesProps) {
  const currency = data.getCurrency();
  const slices = sliceInterval({interval, granularity});
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
            formatter: currencyFormatter(currency),
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
            data: slices.map(i => data.get(i.start).round().dollar()),
          },
        ],
      }}
    />
  );
}

function Line({title, interval, granularity, data}: TimeseriesProps) {
  const currency = data.getCurrency();
  const slices = sliceInterval({interval, granularity});
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
            formatter: currencyFormatter(currency),
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
            name: title,
            data: slices.map(i => data.get(i.start).round().dollar()),
          },
        ],
      }}
    />
  );
}

function HorizontalBar({title, currency, data}: HorizontalBarProps) {
  const categories = data.map(({name}) => name);
  const values = data.map(({amount}) => amount.round().dollar());
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
            formatter: currencyFormatter(currency),
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

function stackedBarChartTooltip(c: Currency): EChartsOption {
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      formatter: stackedBarChartTooltipFormatter(c),
    },
  };
}

type TooltipFormatterCallback = Exclude<
  NonNullable<TooltipComponentOption['formatter']>,
  string
>;
type SingleTooltipFormatterParams = CallbackDataParams & {
  axisValueLabel?: string;
};

type ToolTipFormatterParams =
  | SingleTooltipFormatterParams
  | Array<SingleTooltipFormatterParams>;

function stackedBarChartTooltipFormatter(
  c: Currency
): TooltipFormatterCallback {
  return (params: ToolTipFormatterParams) => {
    if (!Array.isArray(params)) {
      throw new Error(`Stacked bar should have params array, got ${params}`);
    }
    if (params.length === 0) {
      return 'No data';
    }
    const rows = params
      .sort((a, b) => mustBeNumber(b.value) - mustBeNumber(a.value))
      .filter(p => p.value != 0)
      .map(p => {
        return `
        <div class="flex gap-2">
          <div class="grow">
            ${p.marker} ${p.seriesName}
          </div>
          <div class="font-medium">
            ${mustFormatCurrency(c, p.value)}
          </div>
        </div>
        `;
      })
      .join('\n');
    const out = `
      <div>
        <span class="text-lg">
          ${params[0].axisValueLabel}
        </span>
        ${rows}
      </div>`;
    return out;
  };
}

function mustBeNumber(v: unknown): number {
  if (typeof v === 'number') {
    return v;
  }
  throw new Error(`Unexpected value ${v}`);
}

function currencyFormatter(c: Currency) {
  return (v: number) => formatCurrency(c, v, {maximumFractionDigits: 0});
}

function mustFormatCurrency(c: Currency, v: unknown): string {
  if (typeof v === 'number') {
    return currencyFormatter(c)(v);
  }
  throw new Error(`Unexpected value ${v}`);
}

function StackedBar({
  data,
  granularity,
  interval,
  currency,
  title,
}: StackedBarProps) {
  const slices = sliceInterval({interval, granularity});
  return (
    <ReactEcharts
      notMerge
      option={{
        ...stackedBarChartTooltip(currency),
        grid: {
          containLabel: true,
        },
        yAxis: {
          axisLabel: {
            formatter: currencyFormatter(currency),
          },
        },
        xAxis: {
          data: slices.map(formatInterval),
        },
        title: {
          text: title,
        },
        series: data.map(({name, series}) => ({
          type: 'bar',
          stack: 'money',
          name,
          data: slices.map(i => series.get(i.start).round().dollar()),
        })),
      }}
    />
  );
}

const echartsImpl: ChartsLibrary = {Line, Bar, HorizontalBar, StackedBar};
export default echartsImpl;
