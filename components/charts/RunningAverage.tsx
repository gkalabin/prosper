import { eachMonthOfInterval, Interval } from "date-fns";
import ReactEcharts from "echarts-for-react";
import { AmountWithCurrency } from "lib/AmountWithCurrency";
import { defaultMoneyChartOptions, legend } from "lib/charts";
import { useDisplayCurrency } from "lib/displaySettings";
import { Transaction } from "lib/model/Transaction";
import { MoneyTimeseries } from "lib/util/Timeseries";

export function RunningAverageOwnShare(props: {
  transactions: Transaction[];
  duration: Interval;
  maxWindowLength: number;
  title: string;
}) {
  const displayCurrency = useDisplayCurrency();
  const net = new MoneyTimeseries(displayCurrency);
  for (const t of props.transactions) {
    net.append(t.timestamp, t.amountOwnShare(displayCurrency));
  }
  const monthlyAmounts = [...net.monthlyMap().entries()].sort(
    ([t1], [t2]) => t1 - t2
  );
  const months = eachMonthOfInterval(props.duration).map((x) => x.getTime());
  const window = [] as AmountWithCurrency[];
  const averages = new Map<number, number>();
  for (const [month, amount] of monthlyAmounts) {
    window.push(amount);
    if (window.length > props.maxWindowLength) {
      window.shift();
    }
    const sum = AmountWithCurrency.sum(window, displayCurrency);
    averages.set(month, Math.round(sum.dollar() / window.length));
  }

  return (
    <ReactEcharts
      notMerge
      option={{
        ...defaultMoneyChartOptions(displayCurrency, months),
        ...legend(),
        title: {
          text: props.title,
        },
        series: [
          {
            type: "bar",
            name: props.title,
            data: months.map((m) => averages.get(m)),
          },
        ],
      }}
    />
  );
}
