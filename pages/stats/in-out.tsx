import { Switch } from "@headlessui/react";
import Layout from "components/Layout";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import {
  Amount,
  CurrencyContextProvider,
  modelFromDatabaseData,
  StockAndCurrencyExchange,
} from "lib/ClientSideModel";
import { useDisplayCurrency } from "lib/displaySettings";
import { AllDatabaseData } from "lib/model/AllDatabaseDataModel";
import { Transaction } from "lib/model/Transaction";
import { allDbDataProps } from "lib/ServerSideDB";
import { formatMonth } from "lib/TimeHelpers";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { useState } from "react";

export const getServerSideProps: GetServerSideProps<AllDatabaseData> =
  allDbDataProps;

export function MoneyInMoneyOut(props: {
  transactions: Transaction[];
  exchange: StockAndCurrencyExchange;
}) {
  const displayCurrency = useDisplayCurrency();
  const [includeTransfersInDelta, setIncludeTransfersInDelta] = useState(false);
  const zero = new Amount({ amountCents: 0, currency: displayCurrency });

  const transactions = props.transactions.filter(
    (t) => !t.isThirdPartyExpense()
  );
  const moneyOut: { [firstOfMonthEpoch: number]: Amount } = {};
  const moneyIn: { [firstOfMonthEpoch: number]: Amount } = {};
  const delta: { [firstOfMonthEpoch: number]: Amount } = {};
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

  const options: Highcharts.Options = {
    title: {
      text: "Money In/Out",
    },
    xAxis: {
      categories: months.map((x) => formatMonth(x)),
    },
    yAxis: {
      min: 0,
    },
    series: [
      {
        type: "column",
        name: "Money In",
        data: months.map((m) => moneyIn[m].wholeDollar()),
        color: "green",
      },
      {
        type: "column",
        name: "Money Out",
        data: months.map((m) => moneyOut[m].wholeDollar()),
        color: "red",
      },
    ],
  };

  const deltaOptions: Highcharts.Options = {
    title: {
      text: null,
    },
    xAxis: {
      categories: months.map((x) => formatMonth(x)),
    },
    series: [
      {
        type: "column",
        name: "Delta",
        data: months.map((m) => delta[m].wholeDollar()),
      },
    ],
  };

  return (
    <>
      <HighchartsReact highcharts={Highcharts} options={options} />
      <div className="flex flex-col gap-2 rounded border p-1 shadow-sm">
        <h1 className="mt-2 text-center text-lg">In minus out</h1>
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

        <HighchartsReact highcharts={Highcharts} options={deltaOptions} />
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
