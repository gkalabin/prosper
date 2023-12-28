import { Interval, eachYearOfInterval } from "date-fns";
import ReactEcharts from "echarts-for-react";
import { defaultYearlyMoneyChart } from "lib/charts";
import { useDisplayCurrency } from "lib/displaySettings";
import { Transaction } from "lib/model/Transaction";
import { MoneyTimeseries } from "lib/util/Timeseries";

export function YearlyOwnShare({
  transactions,
  duration,
  title,
}: {
  transactions: Transaction[];
  duration: Interval;
  title: string;
}) {
  const displayCurrency = useDisplayCurrency();
  const years = eachYearOfInterval(duration);
  const data = new MoneyTimeseries(displayCurrency);
  for (const t of transactions) {
    const exchanged = t.amountOwnShare(displayCurrency);
    data.append(t.timestamp, exchanged);
  }
  return (
    <ReactEcharts
      notMerge
      option={{
        ...defaultYearlyMoneyChart(displayCurrency, duration),
        title: {
          text: title,
        },
        series: [
          {
            type: "bar",
            name: title,
            data: data.yearRoundDollars(years),
          },
        ],
      }}
    />
  );
}


export function YearlyAllParties({
  transactions,
  duration,
  title,
}: {
  transactions: Transaction[];
  duration: Interval;
  title: string;
}) {
  const displayCurrency = useDisplayCurrency();
  const years = eachYearOfInterval(duration);
  const data = new MoneyTimeseries(displayCurrency);
  for (const t of transactions) {
    const exchanged = t.amountAllParties(displayCurrency);
    data.append(t.timestamp, exchanged);
  }
  return (
    <ReactEcharts
      notMerge
      option={{
        ...defaultYearlyMoneyChart(displayCurrency, duration),
        title: {
          text: title,
        },
        series: [
          {
            type: "bar",
            name: title,
            data: data.yearRoundDollars(years),
          },
        ],
      }}
    />
  );
}
