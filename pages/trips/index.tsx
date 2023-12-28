import classNames from "classnames";
import Layout from "components/Layout";
import {
  isFullyConfigured,
  NotConfiguredYet,
} from "components/NotConfiguredYet";
import { AnchorLink } from "components/ui/buttons";
import { AmountWithCurrency } from "lib/AmountWithCurrency";
import {
  AllDatabaseDataContextProvider,
  StockAndCurrencyExchange,
  useAllDatabaseDataContext,
} from "lib/ClientSideModel";
import { useDisplayCurrency } from "lib/displaySettings";
import { Currency } from "lib/model/Currency";
import { Stock } from "lib/model/Stock";
import { Transaction } from "lib/model/Transaction";
import { Trip } from "lib/model/Trip";
import { allDbDataProps } from "lib/ServerSideDB";
import { InferGetServerSidePropsType } from "next";

export const getServerSideProps = allDbDataProps;
export default function Page(
  dbData: InferGetServerSidePropsType<typeof getServerSideProps>
) {
  if (!isFullyConfigured(dbData)) {
    return <NotConfiguredYet />;
  }
  return (
    <AllDatabaseDataContextProvider dbData={dbData}>
      <PageLayout />
    </AllDatabaseDataContextProvider>
  );
}

const amountSum = (
  txs: Transaction[],
  currency: Currency,
  exchange: StockAndCurrencyExchange
): AmountWithCurrency => {
  return txs
    .filter((t) => !t.isTransfer() && !t.isIncome())
    .map((t) => {
      const u = t.unit();
      if (u instanceof Currency) {
        const amount = new AmountWithCurrency({
          amountCents: t.amt().cents(),
          currency: u,
        });
        return exchange.exchangeCurrency(amount, currency, t.timestamp);
      }
      if (u instanceof Stock) {
        const sharesValue = exchange.exchangeStock(
          t.amt(),
          u,
          currency,
          t.timestamp
        );
        return exchange.exchangeCurrency(sharesValue, currency, t.timestamp);
      }
      throw new Error(`Unknown unit type: ${u} for transaction ${t.id}`);
    })
    .reduce((a, b) => a.add(b));
};

function PageLayout() {
  return (
    <Layout>
      <TripsList />
    </Layout>
  );
}

function TripsList() {
  const { trips, transactions, exchange } = useAllDatabaseDataContext();
  const displayCurrency = useDisplayCurrency();
  const transactionsByTripId = new Map<number, Transaction[]>(
    trips.map((t) => [
      t.id(),
      transactions
        .filter((tx) => tx.hasTrip())
        .filter((tx) => tx.trip().id() == t.id()),
    ])
  );
  const tripEpoch = (trip: Trip): number => {
    const txs = transactions
      .filter((x) => x.hasTrip() && x.trip().id() == trip.id())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    if (!txs.length) {
      return new Date().getTime();
    }
    return txs[0].timestamp.getTime();
  };
  const totalByTrip = new Map<number, AmountWithCurrency>(
    trips.map((t) => [
      t.id(),
      amountSum(transactionsByTripId.get(t.id()), displayCurrency, exchange),
    ])
  );
  const totals = [...totalByTrip.values()]
    .map((x) => x.dollar())
    .sort((a, b) => a - b);
  const [p25, p50, p75] = [
    totals.length / 4,
    totals.length / 2,
    (3 * totals.length) / 4,
  ].map((i) => totals[Math.round(i)]);
  const p25Trips = [...totalByTrip.entries()]
    .filter(([_, total]) => total.dollar() < p25)
    .map(([id]) => id);
  const p50Trips = [...totalByTrip.entries()]
    .filter(([_, total]) => p25 <= total.dollar() && total.dollar() < p50)
    .map(([id]) => id);
  const p75Trips = [...totalByTrip.entries()]
    .filter(([_, total]) => p50 <= total.dollar() && total.dollar() < p75)
    .map(([id]) => id);
  const p100Trips = [...totalByTrip.entries()]
    .filter(([_, total]) => p75 <= total.dollar())
    .map(([id]) => id);
  const tripsByTs = [...trips].sort((t1, t2) => tripEpoch(t2) - tripEpoch(t1));
  return (
    <>
      {tripsByTs.map((t) => (
        <div
          key={t.id()}
          className={classNames({
            "text-xl leading-7": p100Trips.includes(t.id()),
            "text-lg leading-7": p75Trips.includes(t.id()),
            "text-base leading-7": p50Trips.includes(t.id()),
            "text-sm leading-7": p25Trips.includes(t.id()),
          })}
        >
          <AnchorLink href={`/trips/${t.name()}`}>
            {t.name()} {totalByTrip.get(t.id()).format()}
          </AnchorLink>
        </div>
      ))}
    </>
  );
}
