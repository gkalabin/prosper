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
import { Transaction } from "lib/model/Transaction";
import { AllDatabaseData, allDbDataProps } from "lib/ServerSideDB";
import { formatMonth } from "lib/TimeHelpers";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";

export const getServerSideProps: GetServerSideProps<AllDatabaseData> =
  allDbDataProps;

export function MoneyOutMoneyIn(props: {
  transactions: Transaction[];
  exchange: StockAndCurrencyExchange;
}) {
  const displayCurrency = useDisplayCurrency();
  const zero = new Amount({ amountCents: 0, currency: displayCurrency });

  const transactions = props.transactions.filter(
    (t) => !t.isThirdPartyExpense()
  );
  const moneyOut: { [firstOfMonthEpoch: number]: Amount } = {};
  const moneyIn: { [firstOfMonthEpoch: number]: Amount } = {};
  const balance: { [firstOfMonthEpoch: number]: Amount } = {};
  const monthsIndex: { [firstOfMonthEpoch: number]: boolean } = {};
  for (const t of transactions) {
    let amountOut: Amount;
    let amountIn: Amount;
    if (t.isPersonalExpense()) {
      amountOut = t.amount();
    }
    if (t.isIncome()) {
      amountIn = t.amount();
    }
    const ts = t.monthEpoch();
    monthsIndex[ts] = true;
    if (amountOut) {
      moneyOut[ts] ??= zero;
      const exchanged = props.exchange.exchange(
        amountOut,
        displayCurrency,
        t.timestamp
      );
      moneyOut[ts] = moneyOut[ts].add(exchanged);
    }
    if (amountIn) {
      moneyIn[ts] ??= zero;
      const exchanged = props.exchange.exchange(
        amountIn,
        displayCurrency,
        t.timestamp
      );
      moneyIn[ts] = moneyIn[ts].add(exchanged);
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

    },
    series: [
      {
        type: "bar",
        name: "Money Out",
        data: months.map((m) => [
          formatMonth(new Date(m)),
          moneyOut[m].wholeDollar(),
        ]),
      },
    ],
  };

  return <HighchartsReact highcharts={Highcharts} options={options} />;
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
          onSelected: () => {
            //
          },
        },
      ]}
    >
      <CurrencyContextProvider init={dbData.dbCurrencies}>
        <MoneyOutMoneyIn transactions={transactions} exchange={exchange} />
      </CurrencyContextProvider>
    </Layout>
  );
}
