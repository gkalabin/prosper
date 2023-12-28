import { Interval } from "date-fns";
import ReactEcharts from "echarts-for-react";
import { useAllDatabaseDataContext } from "lib/ClientSideModel";
import { defaultMonthlyMoneyChart, monthlyData } from "lib/charts";
import { useDisplayCurrency } from "lib/displaySettings";
import { Expense } from "lib/model/transaction/Transaction";
import { amountOwnShare } from "lib/model/transaction/amounts";
import { Income } from "lib/model/transaction/Income";
import { MoneyTimeseries } from "lib/util/Timeseries";
import { runningAverage } from "lib/util/util";

export function RunningAverageOwnShare(props: {
  transactions: (Expense | Income)[];
  duration: Interval;
  maxWindowLength: number;
  title: string;
}) {
  const displayCurrency = useDisplayCurrency();
  const { bankAccounts, stocks, exchange } = useAllDatabaseDataContext();
  const net = new MoneyTimeseries(displayCurrency);
  for (const t of props.transactions) {
    const amount = amountOwnShare(
      t,
      displayCurrency,
      bankAccounts,
      stocks,
      exchange
    );
    net.append(t.timestampEpoch, amount);
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
