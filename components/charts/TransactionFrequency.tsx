import { Interval, eachMonthOfInterval, startOfMonth } from "date-fns";
import ReactEcharts from "echarts-for-react";
import { defaultCountChartOptions } from "lib/charts";
import { Transaction } from "lib/model/Transaction";
import { AppendMap } from "lib/util/AppendingMap";

export function TransactionFrequencyChart({
  transactions,
  duration,
}: {
  transactions: Transaction[];
  duration: Interval;
}) {
  const months = eachMonthOfInterval(duration).map((t) => t.getTime());
  const count = new AppendMap<number, number>((a, b) => a + b, 0);
  for (const t of transactions) {
    const ts = startOfMonth(t.timestampEpoch).getTime();
    count.append(ts, 1);
  }

  return (
    <ReactEcharts
      notMerge
      option={{
        ...defaultCountChartOptions(months),
        title: {
          text: "Count of transactions",
        },
        series: [
          {
            type: "bar",
            data: months.map((m) => count.get(m)),
          },
        ],
      }}
    />
  );
}
