import { Interval } from "date-fns";
import ReactEcharts from "echarts-for-react";
import { defaultMonthlyMoneyChart, monthlyData } from "lib/charts";
import { useDisplayCurrency } from "lib/displaySettings";
import { Transaction } from "lib/model/Transaction";
import { MoneyTimeseries } from "lib/util/Timeseries";
import { runningAverage } from "lib/util/util";

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
  return (
    <RunningAverageAmounts
      timeseries={net}
      duration={props.duration}
      maxWindowLength={props.maxWindowLength}
      title={props.title}
    />
  );
}

export function RunningAverageAmounts(props: {
  timeseries: MoneyTimeseries;
  duration: Interval;
  maxWindowLength: number;
  title: string;
}) {
  const displayCurrency = useDisplayCurrency();
  const averages = runningAverage(
    props.timeseries.monthlyMap(),
    props.maxWindowLength
  );
  return (
    <ReactEcharts
      notMerge
      option={{
        ...defaultMonthlyMoneyChart(displayCurrency, props.duration),
        title: {
          text: props.title,
        },
        series: [
          {
            type: "bar",
            name: props.title,
            data: monthlyData(props.duration, averages),
          },
        ],
      }}
    />
  );
}
