import { Switch } from "@headlessui/react";
import Layout from "components/Layout";
import { EChartOption } from "echarts";
import ReactEcharts from "echarts-for-react";
import {
  AmountWithCurrency,
  CurrencyContextProvider,
  modelFromDatabaseData,
  StockAndCurrencyExchange,
} from "lib/ClientSideModel";
import { useDisplayCurrency } from "lib/displaySettings";
import { Transaction } from "lib/model/Transaction";
import { allDbDataProps } from "lib/ServerSideDB";
import { formatMonth } from "lib/TimeHelpers";
import { InferGetServerSidePropsType } from "next";
import { useState } from "react";

export const getServerSideProps = allDbDataProps;

export function MoneyInMoneyOut(props: {
  transactions: Transaction[];
  exchange: StockAndCurrencyExchange;
}) {
  const displayCurrency = useDisplayCurrency();
  const [includeTransfersInDelta, setIncludeTransfersInDelta] = useState(false);
  const zero = new AmountWithCurrency({
    amountCents: 0,
    currency: displayCurrency,
  });

  const transactions = props.transactions.filter(
    (t) => !t.isThirdPartyExpense()
  );
  const moneyOut: { [firstOfMonthEpoch: number]: AmountWithCurrency } = {};
  const moneyIn: { [firstOfMonthEpoch: number]: AmountWithCurrency } = {};
  const delta: { [firstOfMonthEpoch: number]: AmountWithCurrency } = {};
  const monthsIndex: { [firstOfMonthEpoch: number]: boolean } = {};
  for (const t of transactions) {
    const ts = t.monthEpoch();
    monthsIndex[ts] = true;

    moneyIn[ts] ??= zero;
    moneyOut[ts] ??= zero;
    delta[ts] ??= zero;

    if (t.isPersonalExpense()) {
      const exchanged = props.exchange.exchange(
        t.amount(),
        displayCurrency,
        t.timestamp
      );
      moneyOut[ts] = moneyOut[ts].add(exchanged);
      delta[ts] = delta[ts].subtract(exchanged);
    }
    if (t.isIncome()) {
      const exchanged = props.exchange.exchange(
        t.amount(),
        displayCurrency,
        t.timestamp
      );
      moneyIn[ts] = moneyIn[ts].add(exchanged);
      delta[ts] = delta[ts].add(exchanged);
    }
    if (includeTransfersInDelta && t.isTransfer()) {
      const send = props.exchange.exchange(
        t.amount(),
        displayCurrency,
        t.timestamp
      );
      const received = props.exchange.exchange(
        t.amountReceived(),
        displayCurrency,
        t.timestamp
      );
      delta[ts] = delta[ts].subtract(send).add(received);
    }
  }

  const months = Object.keys(monthsIndex)
    .map((x) => +x)
    .sort();
  months.forEach((m) => {
    moneyIn[m] ??= zero;
    moneyOut[m] ??= zero;
  });

  const inOutOptions: EChartOption = {
    title: {
      text: "Money In/Out",
    },
    tooltip: {},
    legend: {
      orient: "horizontal",
      bottom: 10,
      top: "bottom",
    },
    xAxis: {
      data: months.map((x) => formatMonth(x)),
    },
    yAxis: {},
    series: [
      {
        type: "bar",
        name: "Money In",
        data: months.map((m) => Math.round(moneyIn[m].dollar())),
        itemStyle: {
          color: "#15803d",
        },
      },
      {
        type: "bar",
        name: "Money Out",
        data: months.map((m) => Math.round(moneyOut[m].dollar())),
        itemStyle: {
          color: "#b91c1c",
        },
      },
    ],
  };
  const deltaOptions: EChartOption = {
    tooltip: {},
    xAxis: {
      data: months.map((x) => formatMonth(x)),
    },
    yAxis: {},
    series: [
      {
        type: "bar",
        name: "Delta",
        data: months.map((m) => Math.round(delta[m].dollar())),
      },
    ],
  };

  return (
    <>
      <ReactEcharts option={inOutOptions} />

      <div className="flex flex-col gap-2 rounded border p-1 shadow-sm">
        <h1 className="mt-2 text-center text-lg">Delta: in-out</h1>
        <Switch.Group>
          <div className="flex items-center">
            <div className="flex">
              <Switch
                checked={includeTransfersInDelta}
                onChange={() =>
                  setIncludeTransfersInDelta(!includeTransfersInDelta)
                }
                className={`${
                  includeTransfersInDelta ? "bg-indigo-700" : "bg-gray-200"
                } relative inline-flex h-6 w-11 items-center rounded-full`}
              >
                <span
                  className={`${
                    includeTransfersInDelta ? "translate-x-6" : "translate-x-1"
                  } inline-block h-4 w-4 transform rounded-full bg-white transition`}
                />
              </Switch>
            </div>
            <div className="ml-4 text-sm">
              <Switch.Label className="font-medium text-gray-700">
                Include transfers
              </Switch.Label>
              <p className="text-gray-500">
                Include sent minus received amount for transfers in total.
                Relevant for currency exchanges.
              </p>
            </div>
          </div>
        </Switch.Group>

        <ReactEcharts option={deltaOptions} />
      </div>
    </>
  );
}

export default function TransactionsPage(
  dbData: InferGetServerSidePropsType<typeof getServerSideProps>
) {
  const { transactions, exchange } = modelFromDatabaseData(dbData);

  return (
    <Layout
      subheader={[
        {
          title: "Income/Expense",
          path: "/stats/in-out",
        },
        {
          title: "Month drilldown",
          path: "/stats/monthly",
        },
      ]}
    >
      <CurrencyContextProvider init={dbData.dbCurrencies}>
        <MoneyInMoneyOut transactions={transactions} exchange={exchange} />
      </CurrencyContextProvider>
    </Layout>
  );
}
