import { Interval, eachMonthOfInterval } from "date-fns";
import ReactEcharts from "echarts-for-react";
import { defaultMonthlyMoneyChart } from "lib/charts";
import { useDisplayCurrency } from "lib/displaySettings";
import { Transaction } from "lib/model/Transaction";
import { MoneyTimeseries } from "lib/util/Timeseries";

export function MonthlyOwnShare({
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
        ...defaultMonthlyMoneyChart(displayCurrency, duration),
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
