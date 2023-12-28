import ReactEcharts from "echarts-for-react";
import { useAllDatabaseDataContext } from "lib/ClientSideModel";
import { useDisplayCurrency } from "lib/displaySettings";
import { Expense, amountOwnShare } from "lib/model/Transaction";
import { AppendMap, currencyAppendMap } from "lib/util/AppendingMap";
import { topN, topNAmount } from "lib/util/util";

export function TopNVendorsMostSpent({
  transactions,
  title,
  n,
}: {
  transactions: Expense[];
  title: string;
  n: number;
}) {
  const displayCurrency = useDisplayCurrency();
  const { bankAccounts, stocks, exchange } = useAllDatabaseDataContext();
  const sum = currencyAppendMap<string>(displayCurrency);
  for (const t of transactions) {
    const amount = amountOwnShare(
      t,
      displayCurrency,
      bankAccounts,
      stocks,
      exchange
    );
    sum.append(t.vendor, amount);
  }
  const topSum = topNAmount(sum, n, (x) => `Other ${x} vendors`);
  return (
    <ReactEcharts
      notMerge
      option={{
        grid: {
          containLabel: true,
        },
        tooltip: {},
        xAxis: {
          data: topSum.map(([vendor]) => vendor),
        },
        yAxis: {},
        title: {
          text: title,
        },
        series: [
          {
            type: "bar",
            data: topSum.map(([_, sum]) => sum.round().dollar()),
          },
        ],
      }}
    />
  );
}

export function TopNVendorsMostTransactions({
  transactions,
  title,
  n,
}: {
  transactions: Expense[];
  title: string;
  n: number;
}) {
  const count = new AppendMap<string, number>((a, b) => a + b, 0);
  for (const t of transactions) {
    count.append(t.vendor, 1);
  }
  const topCount = topN(count, n, (x) => `Other ${x} vendors`);

  return (
    <ReactEcharts
      notMerge
      option={{
        grid: {
          containLabel: true,
        },
        tooltip: {},
        xAxis: {
          data: topCount.map(([vendor]) => vendor),
        },
        yAxis: {},
        title: {
          text: title,
        },
        series: [
          {
            type: "bar",
            data: topCount.map(([_, sum]) => sum),
          },
        ],
      }}
    />
  );
}
