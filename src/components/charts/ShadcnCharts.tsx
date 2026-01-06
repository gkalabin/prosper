import {
  ChartsLibrary,
  HorizontalBarMoneyProps,
  HorizontalBarNumbersProps,
  StackedBarProps,
  TimeseriesMoneyProps,
  TimeseriesNumbersProps,
} from '@/components/charts/ChartsLibrary';
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {Currency, formatCurrency} from '@/lib/model/Currency';
import {formatInterval, sliceInterval} from '@/lib/util/time';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts';

function BarChartImpl(props: TimeseriesMoneyProps | TimeseriesNumbersProps) {
  const slices = sliceInterval({
    interval: props.interval,
    granularity: props.granularity,
  });
  let data: Array<{date: string; value: number}> = [];
  let currency: Currency | undefined;

  if (isTimeseriesMoneyProps(props)) {
    currency = props.currency;
    data = slices.map(i => ({
      date: formatInterval(i),
      value: props.data.get(i.start).round().dollar(),
    }));
  } else if (isTimeseriesNumberProps(props)) {
    data = slices.map(i => ({
      date: formatInterval(i),
      value: props.data.get(i.start),
    }));
  }

  const chartConfig = {
    value: {
      label: props.title,
      color: 'hsl(var(--chart-1))',
    },
  } satisfies ChartConfig;

  return (
    <div className="w-full space-y-2">
      <h3 className="text-center text-sm font-medium">{props.title}</h3>
      <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
        <BarChart accessibilityLayer data={data}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
          />
          <YAxis
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            tickFormatter={value =>
              currency
                ? formatCurrency(currency, value, {maximumFractionDigits: 0})
                : value
            }
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={value =>
                  currency
                    ? formatCurrency(currency, Number(value))
                    : String(value)
                }
              />
            }
          />
          <Bar dataKey="value" fill="var(--color-value)" radius={4} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}

function LineChartImpl(props: TimeseriesMoneyProps | TimeseriesNumbersProps) {
  const slices = sliceInterval({
    interval: props.interval,
    granularity: props.granularity,
  });
  let data: Array<{date: string; value: number}> = [];
  let currency: Currency | undefined;

  if (isTimeseriesMoneyProps(props)) {
    currency = props.currency;
    data = slices.map(i => ({
      date: formatInterval(i),
      value: props.data.get(i.start).round().dollar(),
    }));
  } else if (isTimeseriesNumberProps(props)) {
    data = slices.map(i => ({
      date: formatInterval(i),
      value: props.data.get(i.start),
    }));
  }

  const chartConfig = {
    value: {
      label: props.title,
      color: 'hsl(var(--chart-1))',
    },
  } satisfies ChartConfig;

  return (
    <div className="w-full space-y-2">
      <h3 className="text-center text-sm font-medium">{props.title}</h3>
      <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
        <LineChart accessibilityLayer data={data}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
          />
          <YAxis
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            tickFormatter={value =>
              currency
                ? formatCurrency(currency, value, {maximumFractionDigits: 0})
                : value
            }
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={value =>
                  currency
                    ? formatCurrency(currency, Number(value))
                    : String(value)
                }
              />
            }
          />
          <Line
            dataKey="value"
            stroke="var(--color-value)"
            type="monotone"
            dot={false}
            strokeWidth={2}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}

function HorizontalBarChart(
  props: HorizontalBarMoneyProps | HorizontalBarNumbersProps
) {
  let data: Array<{name: string; value: number}> = [];
  let currency: Currency | undefined;

  if (isHorizontalBarMoneyProps(props)) {
    currency = props.currency;
    data = props.data.map(({name, amount}) => ({
      name,
      value: amount.round().dollar(),
    }));
  } else if (isHorizontalBarNumberProps(props)) {
    data = props.data.map(({name, amount}) => ({
      name,
      value: amount,
    }));
  }

  const chartConfig = {
    value: {
      label: props.title,
      color: 'hsl(var(--chart-1))',
    },
  } satisfies ChartConfig;

  return (
    <div className="w-full space-y-2">
      <h3 className="text-center text-sm font-medium">{props.title}</h3>
      <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
        <BarChart
          accessibilityLayer
          data={data}
          layout="vertical"
          margin={{left: 20}}
        >
          <CartesianGrid horizontal={false} />
          <XAxis
            type="number"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            tickFormatter={value =>
              currency
                ? formatCurrency(currency, value, {maximumFractionDigits: 0})
                : value
            }
          />
          <YAxis
            dataKey="name"
            type="category"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            width={100}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={value =>
                  currency
                    ? formatCurrency(currency, Number(value))
                    : String(value)
                }
              />
            }
          />
          <Bar dataKey="value" fill="var(--color-value)" radius={4} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}

function StackedBar({
  data,
  granularity,
  interval,
  currency,
  title,
}: StackedBarProps) {
  const slices = sliceInterval({interval, granularity});

  const chartData = slices.map(i => {
    const point: {[key: string]: string | number} = {
      date: formatInterval(i),
    };
    data.forEach(({name, series}) => {
      point[name] = series.get(i.start).round().dollar();
    });
    return point;
  });

  const chartConfig: ChartConfig = {};
  data.forEach((series, index) => {
    chartConfig[series.name] = {
      label: series.name,
      color: `hsl(var(--chart-${(index % 5) + 1}))`,
    };
  });

  return (
    <div className="w-full space-y-2">
      <h3 className="text-center text-sm font-medium">{title}</h3>
      <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
        <BarChart accessibilityLayer data={chartData}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
          />
          <YAxis
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            tickFormatter={value =>
              formatCurrency(currency, value, {maximumFractionDigits: 0})
            }
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={value => formatCurrency(currency, Number(value))}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          {data.map(({name}) => (
            <Bar
              key={name}
              dataKey={name}
              stackId="a"
              fill={`var(--color-${name})`}
              radius={4}
            />
          ))}
        </BarChart>
      </ChartContainer>
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

export const ShadcnCharts: ChartsLibrary = {
  Line: LineChartImpl,
  Bar: BarChartImpl,
  HorizontalBar: HorizontalBarChart,
  StackedBar,
};
