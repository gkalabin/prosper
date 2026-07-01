'use client';
import {
  ChartsLibrary,
  HorizontalBarMoneyProps,
  HorizontalBarNumbersProps,
  SparklineProps,
  StackedBarProps,
  TimeseriesMoneyProps,
  TimeseriesNumbersProps,
} from '@/components/charts/ChartsLibrary';
import {Echart} from '@/components/charts/Echart';
import {Amount} from '@/lib/Amount';
import {Currency, formatCurrency} from '@/lib/model/Currency';
import {formatInterval, sliceInterval} from '@/lib/util/time';
import {type EChartsOption} from 'echarts';
import {type TooltipComponentOption} from 'echarts/components';
import {CallbackDataParams} from 'echarts/types/dist/shared';

const FULL_CHART_CLASS = 'h-[300px] w-full';

function Bar(props: TimeseriesMoneyProps | TimeseriesNumbersProps) {
  return <BarOrLine {...props} type={'bar'} />;
}

function Line(props: TimeseriesMoneyProps | TimeseriesNumbersProps) {
  return <BarOrLine {...props} type={'line'} />;
}

function BarOrLine(
  props: (TimeseriesMoneyProps | TimeseriesNumbersProps) & {
    type: 'bar' | 'line';
  }
) {
  const slices = sliceInterval({
    interval: props.interval,
    granularity: props.granularity,
  });
  let values: number[] = [];
  let yAxis: EChartsOption['yAxis'] = {};
  if (isTimeseriesMoneyProps(props)) {
    values = slices.map(i => props.data.get(i.start).round().dollar());
    yAxis = {
      axisLabel: {
        formatter: currencyFormatter(props.currency),
      },
    };
  } else if (isTimeseriesNumberProps(props)) {
    values = slices.map(i => props.data.get(i.start));
    yAxis = {};
  } else {
    const exhaustiveCheck: never = props;
    throw new Error(`Unknown props type ${exhaustiveCheck}`);
  }
  return (
    <div
      data-chart-title={props.title}
      data-chart-values={JSON.stringify(values)}
    >
      <Echart
        className={FULL_CHART_CLASS}
        option={{
          grid: {
            containLabel: true,
          },
          tooltip: {},
          yAxis,
          xAxis: {
            data: slices.map(formatInterval),
          },
          title: {
            text: props.title,
          },
          series: [
            {
              type: props.type,
              name: props.title,
              data: values,
            },
          ],
        }}
      />
    </div>
  );
}

function isTimeseriesMoneyProps(
  props: TimeseriesMoneyProps | TimeseriesNumbersProps
): props is TimeseriesMoneyProps {
  return !!(props as TimeseriesMoneyProps).currency;
}

function isTimeseriesNumberProps(
  props: TimeseriesMoneyProps | TimeseriesNumbersProps
): props is TimeseriesNumbersProps {
  return !(props as TimeseriesMoneyProps).currency;
}

// The theme's `--foreground` colour; ECharts cannot resolve CSS variables.
const SPARKLINE_COLOR = '#1b1a17';
const SPARKLINE_FILL_OPACITY = 0.13;

function Sparkline({title, currency, data}: SparklineProps) {
  const values = data.map(d => d.amount.round().dollar());
  return (
    <div data-chart-title={title} data-chart-values={JSON.stringify(values)}>
      <Echart
        className="h-[132px] w-full"
        option={{
          grid: {left: 0, right: 0, top: 8, bottom: 0},
          xAxis: {
            type: 'category',
            show: false,
            boundaryGap: false,
            data: data.map(d => d.timestamp),
          },
          yAxis: {type: 'value', show: false, scale: true},
          tooltip: {
            trigger: 'axis',
            formatter: sparklineTooltipFormatter(currency),
          },
          color: [SPARKLINE_COLOR],
          series: [
            {
              type: 'line',
              name: title,
              data: values,
              showSymbol: false,
              smooth: true,
              lineStyle: {width: 2},
              areaStyle: {opacity: SPARKLINE_FILL_OPACITY},
              markPoint: {
                symbol: 'circle',
                symbolSize: 7,
                data: [
                  {name: title, coord: [values.length - 1, values.at(-1) ?? 0]},
                ],
                label: {show: false},
              },
            },
          ],
        }}
      />
    </div>
  );
}

function sparklineTooltipFormatter(c: Currency): TooltipFormatterCallback {
  return (params: ToolTipFormatterParams) => {
    const first = Array.isArray(params) ? params[0] : params;
    if (!first) {
      return '';
    }
    return mustFormatCurrency(c, first.value);
  };
}

function isHorizontalBarMoneyProps(
  props: HorizontalBarMoneyProps | HorizontalBarNumbersProps
): props is HorizontalBarMoneyProps {
  return !!(props as HorizontalBarMoneyProps).currency;
}

function isHorizontalBarNumberProps(
  props: HorizontalBarMoneyProps | HorizontalBarNumbersProps
): props is HorizontalBarNumbersProps {
  return !(props as HorizontalBarMoneyProps).currency;
}

function HorizontalBar(
  props: HorizontalBarMoneyProps | HorizontalBarNumbersProps
) {
  const categories = props.data.map(({name}) => name);
  let values: number[] = [];
  let xAxis: EChartsOption['xAxis'] = {};
  if (isHorizontalBarMoneyProps(props)) {
    values = props.data.map(({amount}) => amount.round().dollar());
    xAxis = {
      type: 'value',
      axisLabel: {
        formatter: currencyFormatter(props.currency),
      },
    };
  } else if (isHorizontalBarNumberProps(props)) {
    values = props.data.map(({amount}) => amount);
    xAxis = {
      type: 'value',
    };
  } else {
    const exhaustiveCheck: never = props;
    throw new Error(`Unknown props type ${exhaustiveCheck}`);
  }
  return (
    <Echart
      className={FULL_CHART_CLASS}
      option={{
        title: {
          text: props.title,
        },
        grid: {
          containLabel: true,
        },
        tooltip: {},
        xAxis,
        yAxis: {
          type: 'category',
          data: categories,
        },
        series: [
          {
            type: 'bar',
            name: props.title,
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
  return (v: number) => formatCurrency(c, Amount.fromDollar(v).round());
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
    <Echart
      className={FULL_CHART_CLASS}
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

export const Echarts: ChartsLibrary = {
  Line,
  Bar,
  Sparkline,
  HorizontalBar,
  StackedBar,
};
