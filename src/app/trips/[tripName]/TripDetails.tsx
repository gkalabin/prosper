'use client';
import {ExpenseByChildCategory} from '@/components/charts/ExpenseByChildCategory';
import {CurrencyExchangeFailed} from '@/app/stats/CurrencyExchangeFailed';
import {useExchangedTransactions} from '@/app/stats/modelHelpers';
import {
  NotConfiguredYet,
  isFullyConfigured,
} from '@/components/NotConfiguredYet';
import {
  SortableTransactionsList,
  SortingMode,
} from '@/components/transactions/SortableTransactionsList';
import {AnchorLink} from '@/components/ui/anchors';
import {AmountWithCurrency} from '@/lib/AmountWithCurrency';
import {ExchangedTransactions} from '@/lib/ExchangedTransactions';
import {
  AllDatabaseDataContextProvider,
  useAllDatabaseDataContext,
} from '@/lib/context/AllDatabaseDataContext';
import {AllDatabaseData} from '@/lib/model/AllDatabaseDataModel';
import {Trip, tripModelFromDB} from '@/lib/model/Trip';
import {Trip as DBTrip} from '@prisma/client';

function TripSpendingStats({input}: {input: ExchangedTransactions}) {
  return (
    <>
      <h2 className="mt-4 text-xl leading-7">Expenses by category</h2>
      <ExpenseByChildCategory input={input} />
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
  const {transactions: allTransactions} = useAllDatabaseDataContext();
  const {input, failed} = useExchangedTransactions(allTransactions);
  return (
    <div>
      <AnchorLink href="/trips">Back to all trips</AnchorLink>
      <h1 className="text-xl leading-7">{props.trip.name}</h1>
      <CurrencyExchangeFailed failedTransactions={failed} />
      <TripTextSummary input={input} />
      <TripSpendingStats input={input} />
      <h2 className="mt-4 text-xl leading-7">
        Transactions ({input.transactions().length})
      </h2>
      <SortableTransactionsList
        transactions={input.transactions().map(({t}) => t)}
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
    <AllDatabaseDataContextProvider dbData={dbData}>
      <NonEmptyTripDetails trip={trip} />
    </AllDatabaseDataContextProvider>
  );
}
