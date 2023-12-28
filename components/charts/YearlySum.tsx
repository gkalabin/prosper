import { Interval, eachYearOfInterval } from "date-fns";
import ReactEcharts from "echarts-for-react";
import { useAllDatabaseDataContext } from "lib/ClientSideModel";
import { defaultYearlyMoneyChart } from "lib/charts";
import { useDisplayCurrency } from "lib/displaySettings";
import {
  Expense,
} from "lib/model/transaction/Transaction";
import { amountOwnShare } from "lib/model/transaction/amounts";
import { amountAllParties } from "lib/model/transaction/amounts";
import { Income } from "lib/model/transaction/Income";
import { MoneyTimeseries } from "lib/util/Timeseries";

export function YearlyOwnShare({
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
  const years = eachYearOfInterval(duration);
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
  transactions: (Expense | Income)[];
  duration: Interval;
  title: string;
}) {
  const displayCurrency = useDisplayCurrency();
  const { bankAccounts, stocks, exchange } = useAllDatabaseDataContext();
  const years = eachYearOfInterval(duration);
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
