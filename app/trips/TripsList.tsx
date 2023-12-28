"use client";
import classNames from "classnames";
import {
  isFullyConfigured,
  NotConfiguredYet,
} from "components/NotConfiguredYet";
import { AnchorLink } from "components/ui/anchors";
import { AmountWithCurrency } from "lib/AmountWithCurrency";
import {
  AllDatabaseDataContextProvider,
  StockAndCurrencyExchange,
  useAllDatabaseDataContext,
} from "lib/ClientSideModel";
import { useDisplayCurrency } from "lib/displaySettings";
import { AllDatabaseData } from "lib/model/AllDatabaseDataModel";
import { BankAccount } from "lib/model/BankAccount";
import { Currency } from "lib/model/Currency";
import { Stock } from "lib/model/Stock";
import {
  amountAllParties,
  Expense,
  Income,
  isExpense,
  isIncome,
} from "lib/model/transaction/Transaction";
import { Trip } from "lib/model/Trip";

const amountSum = (
  txs: (Expense | Income)[],
  displayCurrency: Currency,
  bankAccounts: BankAccount[],
  stocks: Stock[],
  exchange: StockAndCurrencyExchange,
): AmountWithCurrency => {
  return txs
    .map((t) =>
      amountAllParties(t, displayCurrency, bankAccounts, stocks, exchange),
    )
    .reduce((a, b) => a.add(b));
};

function NonEmptyTripsList() {
  const { trips, transactions, bankAccounts, stocks, exchange } =
    useAllDatabaseDataContext();
  const displayCurrency = useDisplayCurrency();
  const travelTransactions = transactions
    .filter((tx): tx is Expense | Income => isExpense(tx) || isIncome(tx))
    .filter((tx) => tx.tripId);
  const transactionsByTripId = new Map<number, (Expense | Income)[]>(
    trips.map((t) => [
      t.id,
      travelTransactions.filter((tx) => tx.tripId == t.id),
    ]),
  );
  const tripEpoch = (trip: Trip): number => {
    const txs = travelTransactions
      .filter((x) => x.tripId == trip.id)
      .sort((a, b) => b.timestampEpoch - a.timestampEpoch);
    if (!txs.length) {
      return new Date().getTime();
    }
    return txs[0].timestampEpoch;
  };
  const totalByTrip = new Map<number, AmountWithCurrency>(
    trips.map((t) => [
      t.id,
      amountSum(
        transactionsByTripId.get(t.id),
        displayCurrency,
        bankAccounts,
        stocks,
        exchange,
      ),
    ]),
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
          key={t.id}
          className={classNames({
            "text-xl leading-7": p100Trips.includes(t.id),
            "text-lg leading-7": p75Trips.includes(t.id),
            "text-base leading-7": p50Trips.includes(t.id),
            "text-sm leading-7": p25Trips.includes(t.id),
          })}
        >
          <AnchorLink href={`/trips/${t.name}`}>
            {t.name} {totalByTrip.get(t.id).format()}
          </AnchorLink>
        </div>
      ))}
    </>
  );
}

export function TripsList({ dbData }: { dbData: AllDatabaseData }) {
  if (!isFullyConfigured(dbData)) {
    return <NotConfiguredYet />;
  }
  return (
    <AllDatabaseDataContextProvider dbData={dbData}>
      <NonEmptyTripsList />
    </AllDatabaseDataContextProvider>
  );
}
