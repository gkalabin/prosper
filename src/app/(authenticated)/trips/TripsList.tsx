'use client';
import {
  isFullyConfigured,
  NotConfiguredYet,
} from '@/components/NotConfiguredYet';
import {Button} from '@/components/ui/button';
import {AmountWithCurrency} from '@/lib/AmountWithCurrency';
import {StockAndCurrencyExchange} from '@/lib/ClientSideModel';
import {
  CoreDataContextProvider,
  useCoreDataContext,
} from '@/lib/context/CoreDataContext';
import {useDisplayCurrency} from '@/lib/context/DisplaySettingsContext';
import {
  MarketDataContextProvider,
  useMarketDataContext,
} from '@/lib/context/MarketDataContext';
import {
  TransactionDataContextProvider,
  useTransactionDataContext,
} from '@/lib/context/TransactionDataContext';
import {AllDatabaseData} from '@/lib/model/AllDatabaseDataModel';
import {BankAccount} from '@/lib/model/BankAccount';
import {Currency} from '@/lib/model/Currency';
import {Stock} from '@/lib/model/Stock';
import {amountAllParties} from '@/lib/model/transaction/amounts';
import {Income} from '@/lib/model/transaction/Income';
import {
  Expense,
  isExpense,
  isIncome,
  Transaction,
} from '@/lib/model/transaction/Transaction';
import {Trip} from '@/lib/model/Trip';
import {cn} from '@/lib/utils';
import Link from 'next/link';

function tripTotalSpend(
  tripId: number,
  allTransactions: Transaction[],
  displayCurrency: Currency,
  bankAccounts: BankAccount[],
  stocks: Stock[],
  exchange: StockAndCurrencyExchange
): AmountWithCurrency | undefined {
  let total = AmountWithCurrency.zero(displayCurrency);
  for (const t of allTransactions) {
    if (!isExpense(t) && !isIncome(t)) {
      continue;
    }
    if (t.tripId != tripId) {
      continue;
    }
    const amount = amountAllParties(
      t,
      displayCurrency,
      bankAccounts,
      stocks,
      exchange
    );
    if (!amount) {
      return undefined;
    }
    if (isExpense(t)) {
      total = total.add(amount);
    } else if (isIncome(t)) {
      total = total.subtract(amount);
    } else {
      throw new Error(`Unknown transaction kind: ${t}`);
    }
  }
  return total;
}

function TripTotal({trip}: {trip: Trip}) {
  const {bankAccounts, stocks} = useCoreDataContext();
  const {transactions} = useTransactionDataContext();
  const {exchange} = useMarketDataContext();
  const displayCurrency = useDisplayCurrency();
  const total = tripTotalSpend(
    trip.id,
    transactions,
    displayCurrency,
    bankAccounts,
    stocks,
    exchange
  );
  if (!total) {
    return <span className="text-sm">Cannot calculate total money spend</span>;
  }
  return <>{total.format()}</>;
}

function NonEmptyTripsList() {
  const {trips, bankAccounts, stocks} = useCoreDataContext();
  const {transactions} = useTransactionDataContext();
  const {exchange} = useMarketDataContext();
  const displayCurrency = useDisplayCurrency();
  const travelTransactions = transactions
    .filter((tx): tx is Expense | Income => isExpense(tx) || isIncome(tx))
    .filter(tx => tx.tripId);
  const tripEpoch = (trip: Trip): number => {
    const txs = travelTransactions
      .filter(x => x.tripId == trip.id)
      .sort((a, b) => b.timestampEpoch - a.timestampEpoch);
    if (!txs.length) {
      return new Date().getTime();
    }
    return txs[0].timestampEpoch;
  };
  const totalByTrip = new Map<number, AmountWithCurrency | undefined>(
    trips.map(t => [
      t.id,
      tripTotalSpend(
        t.id,
        transactions,
        displayCurrency,
        bankAccounts,
        stocks,
        exchange
      ),
    ])
  );
  const totals = [...totalByTrip.values()]
    .map(x => x?.dollar() ?? 0)
    .sort((a, b) => a - b);
  const [p25, p50, p75] = [
    totals.length / 4,
    totals.length / 2,
    (3 * totals.length) / 4,
  ].map(i => totals[Math.round(i)]);
  const p25Trips = [...totalByTrip.entries()]
    .filter(([_, total]) => total && total.dollar() < p25)
    .map(([id]) => id);
  const p50Trips = [...totalByTrip.entries()]
    .filter(
      ([_, total]) => total && p25 <= total.dollar() && total.dollar() < p50
    )
    .map(([id]) => id);
  const p75Trips = [...totalByTrip.entries()]
    .filter(
      ([_, total]) => total && p50 <= total.dollar() && total.dollar() < p75
    )
    .map(([id]) => id);
  const p100Trips = [...totalByTrip.entries()]
    .filter(([_, total]) => total && p75 <= total.dollar())
    .map(([id]) => id);
  const tripsByTs = [...trips].sort((t1, t2) => tripEpoch(t2) - tripEpoch(t1));
  return (
    <>
      {tripsByTs.map(t => (
        <div
          key={t.id}
          className={cn({
            'text-xl leading-7': p100Trips.includes(t.id),
            'text-lg leading-7': p75Trips.includes(t.id),
            'text-base leading-7': p50Trips.includes(t.id),
            'text-sm leading-7': p25Trips.includes(t.id),
          })}
        >
          <Button variant="link" size="inherit" asChild>
            <Link href={`/trips/${t.name}`}>
              {t.name} <TripTotal trip={t} />
            </Link>
          </Button>
        </div>
      ))}
    </>
  );
}

export function TripsList({dbData}: {dbData: AllDatabaseData}) {
  if (!isFullyConfigured(dbData)) {
    return <NotConfiguredYet />;
  }
  return (
    <CoreDataContextProvider dbData={dbData}>
      <TransactionDataContextProvider dbData={dbData}>
        <MarketDataContextProvider dbData={dbData}>
          <NonEmptyTripsList />
        </MarketDataContextProvider>
      </TransactionDataContextProvider>
    </CoreDataContextProvider>
  );
}
