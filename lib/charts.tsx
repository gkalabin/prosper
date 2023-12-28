import { EChartsOption } from "echarts";
import { Currency } from "lib/model/Currency";
import { formatMonth } from "lib/TimeHelpers";

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

export function defaultChartOptions(
  c: Currency,
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
    yAxis: {
      axisLabel: {
        formatter: currencyFormatter(c),
      },
    },
  };
}

export function currencyFormatter(c: Currency) {
  return (v) => c.format(v, { maximumFractionDigits: 0 });
}
