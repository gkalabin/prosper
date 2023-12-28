import { Interval, eachMonthOfInterval } from "date-fns";
import ReactEcharts from "echarts-for-react";
import { defaultMonthlyMoneyChart } from "lib/charts";
import { useDisplayCurrency } from "lib/displaySettings";
import { MoneyTimeseries } from "lib/util/Timeseries";

export function MonthlyChart({
  data,
  duration,
  title,
  type,
}: {
  data: MoneyTimeseries;
  duration: Interval;
  title: string;
  type?: "bar" | "line";
}) {
  type ??= "bar";
  const displayCurrency = useDisplayCurrency();
  const months = eachMonthOfInterval(duration);
  return (
    <ReactEcharts
      notMerge
      option={{
        ...defaultMonthlyMoneyChart(displayCurrency, duration),
        title: {
          text: title,
        },
        series: [
          {
            type,
            name: title,
            data: data.monthRoundDollars(months),
          },
        ],
      }}
    />
  );
}
