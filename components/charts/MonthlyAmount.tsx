import { Interval, eachMonthOfInterval } from "date-fns";
import ReactEcharts from "echarts-for-react";
import { defaultMoneyChartOptions, legend } from "lib/charts";
import { useDisplayCurrency } from "lib/displaySettings";
import { Transaction } from "lib/model/Transaction";
import { MoneyTimeseries } from "lib/util/Timeseries";

export function MonthlyNet({
  transactions,
  duration,
  title,
}: {
  transactions: Transaction[];
  duration: Interval;
  title: string;
}) {
  const displayCurrency = useDisplayCurrency();
  const months = eachMonthOfInterval(duration);
  const data = new MoneyTimeseries(displayCurrency);
  for (const t of transactions) {
    const exchanged = t.amountOwnShare(displayCurrency);
    data.append(t.timestamp, exchanged);
  }
  return (
    <ReactEcharts
      notMerge
      option={{
        ...defaultMoneyChartOptions(displayCurrency, months),
        title: {
          text: title,
        },
        series: [
          {
            type: "bar",
            name: title,
            data: data.monthRoundDollars(months),
          },
        ],
      }}
    />
  );
}
