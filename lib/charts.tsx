import {
  Interval,
  eachMonthOfInterval,
  eachYearOfInterval,
  format,
} from "date-fns";
import { EChartsOption } from "echarts";
import { AmountWithCurrency } from "lib/AmountWithCurrency";
import { formatMonth } from "lib/TimeHelpers";
import { Currency } from "lib/model/Currency";

export function stackedBarChartTooltip(c: Currency): EChartsOption {
  return {
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "shadow",
      },
      formatter: stackedBarChartTooltipFormatter(c),
    },
  };
}

export function legend(): EChartsOption {
  return {
    legend: {
      orient: "horizontal",
      bottom: 10,
      top: "bottom",
    },
  };
}

function stackedBarChartTooltipFormatter(c: Currency) {
  const formatter = currencyFormatter(c);
  return (params) => {
    if (params.length === 0) {
      return "No data";
    }
    const rows = params
      .filter((p) => p.value !== 0)
      .sort((a, b) => b.value - a.value)
      .map((p) => {
        return `
        <div class="flex gap-2">
          <div class="grow">
            ${p.marker} ${p.seriesName}
          </div>
          <div class="font-medium">
            ${formatter(p.value)}
          </div>
        </div>
        `;
      })
      .join("\n");
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

export function defaultMonthlyMoneyChart(
  c: Currency,
  interval: Interval
): EChartsOption {
  const months = eachMonthOfInterval(interval).map((x) => x.getTime());
  return {
    ...defaultMoneyChart(c),
    xAxis: {
      data: months.map((x) => formatMonth(x)),
    },
  };
}

export function defaultYearlyMoneyChart(
  c: Currency,
  interval: Interval
): EChartsOption {
  const years = eachYearOfInterval(interval).map((x) => x.getTime());
  return {
    ...defaultMoneyChart(c),
    xAxis: {
      data: years.map((x) => format(x, "yyyy")),
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
      data: months.map((x) => formatMonth(x)),
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
  return (v) => c.format(v, { maximumFractionDigits: 0 });
}

export function monthlyData(
  interval: Interval,
  timeseries: Map<number, AmountWithCurrency>
) {
  const months = eachMonthOfInterval(interval).map((x) => x.getTime());
  return makeData(months, timeseries);
}

export function makeData(
  time: number[],
  timeseries: Map<number, AmountWithCurrency>
) {
  return time.map((m) => timeseries.get(m)?.round()?.dollar() ?? 0);
}
