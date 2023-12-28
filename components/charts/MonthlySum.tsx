import { Interval, eachMonthOfInterval } from "date-fns";
import ReactEcharts from "echarts-for-react";
import { useAllDatabaseDataContext } from "lib/ClientSideModel";
import { defaultMonthlyMoneyChart } from "lib/charts";
import { useDisplayCurrency } from "lib/displaySettings";
import {
  Expense,
} from "lib/model/transaction/Transaction";
import { amountOwnShare } from "lib/model/transaction/amounts";
import { amountAllParties } from "lib/model/transaction/amounts";
import { Income } from "lib/model/transaction/Income";
import { MoneyTimeseries } from "lib/util/Timeseries";

export function MonthlyOwnShare({
  transactions,
  duration,
  title,
}: {
  transactions: (Expense | Income)[];
  duration: Interval;
  title: string;
}) {
  const displayCurrency = useDisplayCurrency();
  const { bankAccounts, stocks, exchange } = useAllDatabaseDataContext();
  const months = eachMonthOfInterval(duration);
  const data = new MoneyTimeseries(displayCurrency);
  for (const t of transactions) {
    const amount = amountOwnShare(
      t,
      displayCurrency,
      bankAccounts,
      stocks,
      exchange
    );
    data.append(t.timestampEpoch, amount);
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

export function MonthlyAllParties({
  transactions,
  duration,
  title,
}: {
  transactions: (Expense | Income)[];
  duration: Interval;
  title: string;
}) {
  const displayCurrency = useDisplayCurrency();
  const { bankAccounts, stocks, exchange } = useAllDatabaseDataContext();
  const months = eachMonthOfInterval(duration);
  const data = new MoneyTimeseries(displayCurrency);
  for (const t of transactions) {
    const amount = amountAllParties(
      t,
      displayCurrency,
      bankAccounts,
      stocks,
      exchange
    );
    data.append(t.timestampEpoch, amount);
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
