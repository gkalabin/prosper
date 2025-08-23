'use client';
import {CurrencyExchangeFailed} from '@/app/(authenticated)/stats/CurrencyExchangeFailed';
import {
  NotConfiguredYet,
  isFullyConfigured,
} from '@/components/NotConfiguredYet';
import {ExpenseByCategory} from '@/components/charts/aggregate/ExpenseByCategory';
import {
  SortableTransactionsList,
  SortingMode,
} from '@/components/transactions/list/SortableTransactionsList';
import {Button} from '@/components/ui/button';
import {AmountWithCurrency} from '@/lib/AmountWithCurrency';
import {ExchangedTransactions} from '@/lib/ExchangedTransactions';
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
import {Trip, tripModelFromDB} from '@/lib/model/Trip';
import {exchangeTransactionAmounts} from '@/lib/model/queries/ExchangeTransactionAmounts';
import {hasTrip} from '@/lib/model/queries/TransactionMetadata';
import {Trip as DBTrip} from '@prisma/client';
import Link from 'next/link';

function TripSpendingStats({input}: {input: ExchangedTransactions}) {
  return (
    <>
      <h2 className="mt-4 text-xl leading-7">Expenses by category</h2>
      <ExpenseByCategory input={input} />
    </>
  );
}

function TripTextSummary({input}: {input: ExchangedTransactions}) {
  let spentAllParties = AmountWithCurrency.zero(input.currency());
  let spentOwnShare = AmountWithCurrency.zero(input.currency());
  for (const {ownShare, allParties} of input.expenses()) {
    spentAllParties = spentAllParties.add(allParties);
    spentOwnShare = spentOwnShare.add(ownShare);
  }
  return (
    <>
      <div>Gross amount: {spentAllParties.format()}</div>
      <div>
        Net amount, own share only: {spentOwnShare.format()} (
        {Math.round((100 * spentOwnShare.dollar()) / spentAllParties.dollar())}
        %)
      </div>
    </>
  );
}

function NonEmptyTripDetails(props: {trip: Trip}) {
  const {transactions} = useTransactionDataContext();
  const {stocks} = useCoreDataContext();
  const {exchange} = useMarketDataContext();
  const displayCurrency = useDisplayCurrency();
  const tripTransactions = transactions
    .filter(hasTrip)
    .filter(t => t.tripId === props.trip.id);
  const {exchanged, failed} = exchangeTransactionAmounts({
    transactions: tripTransactions,
    targetCurrency: displayCurrency,
    stocks,
    exchange,
  });
  return (
    <div>
      <Button variant="link" size="inherit" asChild>
        <Link href="/trips">Back to all trips</Link>
      </Button>
      <h1 className="text-xl leading-7">{props.trip.name}</h1>
      <CurrencyExchangeFailed failedTransactions={failed} />
      <TripTextSummary input={exchanged} />
      <TripSpendingStats input={exchanged} />
      <h2 className="mt-4 text-xl leading-7">
        Transactions ({exchanged.transactions().length})
      </h2>
      <SortableTransactionsList
        transactions={exchanged.transactions().map(({t}) => t)}
        initialSorting={SortingMode.DATE_ASC}
      />
    </div>
  );
}

export function TripDetails({
  dbData,
  dbTrip,
}: {
  dbData: AllDatabaseData;
  dbTrip: DBTrip;
}) {
  if (!isFullyConfigured(dbData)) {
    return <NotConfiguredYet />;
  }
  const trip = tripModelFromDB(dbTrip);
  return (
    <CoreDataContextProvider dbData={dbData}>
      <TransactionDataContextProvider dbData={dbData}>
        <MarketDataContextProvider dbData={dbData}>
          <NonEmptyTripDetails trip={trip} />
        </MarketDataContextProvider>
      </TransactionDataContextProvider>
    </CoreDataContextProvider>
  );
}
