'use client';
import {CurrencyExchangeFailed} from '@/app/stats/CurrencyExchangeFailed';
import {
  NotConfiguredYet,
  isFullyConfigured,
} from '@/components/NotConfiguredYet';
import {
  ChildCategoryFullAmountChart,
  ChildCategoryOwnShareChart,
} from '@/components/charts/CategoryPie';
import {
  SortableTransactionsList,
  SortingMode,
} from '@/components/transactions/SortableTransactionsList';
import {AnchorLink} from '@/components/ui/anchors';
import {AmountWithCurrency} from '@/lib/AmountWithCurrency';
import {
  ExchangedTransaction,
  ExchangedTransactions,
} from '@/lib/ExchangedTransactions';
import {
  AllDatabaseDataContextProvider,
  useAllDatabaseDataContext,
} from '@/lib/context/AllDatabaseDataContext';
import {useDisplayCurrency} from '@/lib/context/DisplaySettingsContext';
import {AllDatabaseData} from '@/lib/model/AllDatabaseDataModel';
import {Trip, tripModelFromDB} from '@/lib/model/Trip';
import {Transaction} from '@/lib/model/transaction/Transaction';
import {
  amountAllParties,
  amountOwnShare,
} from '@/lib/model/transaction/amounts';
import {Trip as DBTrip} from '@prisma/client';

function TripSpendingStats({
  transactions,
}: {
  transactions: ExchangedTransactions;
}) {
  return (
    <>
      <h2 className="mt-4 text-xl leading-7">Expenses by category</h2>
      <ChildCategoryFullAmountChart
        title="Gross"
        transactions={transactions.transactions().map(({t}) => t)}
      />
      <ChildCategoryOwnShareChart
        title="Net"
        transactions={transactions.transactions().map(({t}) => t)}
      />
    </>
  );
}

function TripTextSummary({
  transactions,
}: {
  transactions: ExchangedTransactions;
}) {
  let spentAllParties = AmountWithCurrency.zero(transactions.currency());
  let spentOwnShare = AmountWithCurrency.zero(transactions.currency());
  for (const {ownShare, allParties} of transactions.expenses()) {
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
  const displayCurrency = useDisplayCurrency();
  const {bankAccounts, stocks, exchange} = useAllDatabaseDataContext();
  const exchanged: ExchangedTransaction[] = [];
  const failed: Transaction[] = [];
  for (const t of allTransactions) {
    if (t.kind == 'Transfer') {
      continue;
    }
    if (t.tripId != props.trip.id) {
      continue;
    }
    const own = amountOwnShare(
      t,
      displayCurrency,
      bankAccounts,
      stocks,
      exchange
    );
    if (!own) {
      failed.push(t);
      continue;
    }
    const all = amountAllParties(
      t,
      displayCurrency,
      bankAccounts,
      stocks,
      exchange
    );
    if (!all) {
      failed.push(t);
      continue;
    }
    exchanged.push({
      t,
      ownShare: own,
      allParties: all,
    });
  }
  const transactions = new ExchangedTransactions(exchanged, displayCurrency);
  return (
    <div>
      <AnchorLink href="/trips">Back to all trips</AnchorLink>
      <h1 className="text-xl leading-7">{props.trip.name}</h1>
      <CurrencyExchangeFailed failedTransactions={failed} />
      <TripTextSummary transactions={transactions} />
      <TripSpendingStats transactions={transactions} />
      <h2 className="mt-4 text-xl leading-7">
        Transactions ({transactions.transactions().length})
      </h2>
      <SortableTransactionsList
        transactions={transactions.transactions().map(({t}) => t)}
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
