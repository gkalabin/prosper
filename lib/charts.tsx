import {
  eachMonthOfInterval,
  eachYearOfInterval,
  format,
  type Interval,
} from 'date-fns';
import {type EChartsOption} from 'echarts';
import {type TooltipComponentOption} from 'echarts/components';
import {CallbackDataParams} from 'echarts/types/dist/shared';
import {formatMonth} from 'lib/TimeHelpers';
import {Currency, formatCurrency} from 'lib/model/Currency';

export function stackedBarChartTooltip(c: Currency): EChartsOption {
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

export function legend(): EChartsOption {
  return {
    legend: {
      orient: 'horizontal',
      bottom: 10,
      top: 'bottom',
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

function mustFormatCurrency(c: Currency, v: unknown): string {
  if (typeof v === 'number') {
    return currencyFormatter(c)(v);
  }
  throw new Error(`Unexpected value ${v}`);
}

export function defaultMonthlyMoneyChart(
  c: Currency,
  interval: Interval
): EChartsOption {
  const months = eachMonthOfInterval(interval).map(x => x.getTime());
  return {
    ...defaultMoneyChart(c),
    xAxis: {
      data: months.map(x => formatMonth(x)),
    },
  };
}

export function defaultYearlyMoneyChart(
  c: Currency,
  interval: Interval
): EChartsOption {
  const years = eachYearOfInterval(interval).map(x => x.getTime());
  return {
    ...defaultMoneyChart(c),
    xAxis: {
      data: years.map(x => format(x, 'yyyy')),
    },
  };
}

export function defaultMoneyChart(c: Currency): EChartsOption {
  return {
    grid: {
      containLabel: true,
    },
    tooltip: {},
    yAxis: {
      axisLabel: {
        formatter: currencyFormatter(c),
      },
    },
  };
}

export function defaultCountChartOptions(
  months: number[] | Date[]
): EChartsOption {
  return {
    grid: {
      containLabel: true,
    },
    tooltip: {},
    xAxis: {
      data: months.map(x => formatMonth(x)),
    },
    yAxis: {},
  };
}

export function defaultPieChartOptions(): EChartsOption {
  return {
    grid: {
      containLabel: true,
    },
    tooltip: {},
  };
}

export function currencyFormatter(c: Currency) {
  return (v: number) => formatCurrency(c, v, {maximumFractionDigits: 0});
}
