import {CurrencyExchangeFailed} from 'app/stats/CurrencyExchangeFailed';
import ReactEcharts from 'echarts-for-react';
import {useAllDatabaseDataContext} from 'lib/context/AllDatabaseDataContext';
import {useDisplayCurrency} from 'lib/context/DisplaySettingsContext';
import {Expense, Transaction} from 'lib/model/transaction/Transaction';
import {amountOwnShare} from 'lib/model/transaction/amounts';
import {AppendMap, currencyAppendMap} from 'lib/util/AppendingMap';
import {topN} from 'lib/util/stats';

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
  const {bankAccounts, stocks, exchange} = useAllDatabaseDataContext();
  const sum = currencyAppendMap<string>(displayCurrency);
  // TODO: validate that transactions can be exchanged on the page level
  // and only pass down the exchangeable ones as displaying the same
  // warning for each chart is noisy.
  const failedToExchange: Transaction[] = [];
  for (const t of transactions) {
    const amount = amountOwnShare(
      t,
      displayCurrency,
      bankAccounts,
      stocks,
      exchange
    );
    if (!amount) {
      failedToExchange.push(t);
      continue;
    }
    sum.append(t.vendor, amount);
  }
  // If there is just N+1 items, taking top N would result in only one item rolled into 'others'.
  // To avoid this, if there is N+1 items, just use all of them.
  const topItemsCount = n == sum.size - 1 ? n + 1 : n;
  const dollars = new Map<string, number>(
    [...sum.entries()].map(([vendor, amount]) => [
      vendor,
      amount.round().dollar(),
    ])
  );
  const {top, otherSum, otherCount} = topN(dollars, topItemsCount);
  top.push([`Other ${otherCount} vendors`, otherSum]);
  return (
    <>
      <CurrencyExchangeFailed failedTransactions={failedToExchange} />
      <ReactEcharts
        notMerge
        option={{
          grid: {
            containLabel: true,
          },
          tooltip: {},
          xAxis: {
            data: top.map(([vendor]) => vendor),
          },
          yAxis: {},
          title: {
            text: title,
          },
          series: [
            {
              type: 'bar',
              data: top.map(([_, sum]) => sum),
            },
          ],
        }}
      />
    </>
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
  // If there is just N+1 items, taking top N would result in only one item rolled into 'others'.
  // To avoid this, if there is N+1 items, just use all of them.
  const topItemsCount = n == count.size - 1 ? n + 1 : n;
  const {top, otherSum, otherCount} = topN(count, topItemsCount);
  top.push([`Other ${otherCount} vendors`, otherSum]);

  return (
    <ReactEcharts
      notMerge
      option={{
        grid: {
          containLabel: true,
        },
        tooltip: {},
        xAxis: {
          data: top.map(([vendor]) => vendor),
        },
        yAxis: {},
        title: {
          text: title,
        },
        series: [
          {
            type: 'bar',
            data: top.map(([_, sum]) => sum),
          },
        ],
      }}
    />
  );
}
