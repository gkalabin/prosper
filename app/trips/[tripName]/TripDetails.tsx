"use client";
import { Trip as DBTrip } from "@prisma/client";
import { CurrencyExchangeFailed } from "app/stats/CurrencyExchangeFailed";
import {
  NotConfiguredYet,
  isFullyConfigured,
} from "components/NotConfiguredYet";
import {
  ChildCategoryFullAmountChart,
  ChildCategoryOwnShareChart,
} from "components/charts/CategoryPie";
import {
  SortableTransactionsList,
  SortingMode,
} from "components/transactions/SortableTransactionsList";
import { AnchorLink } from "components/ui/anchors";
import { AmountWithCurrency } from "lib/AmountWithCurrency";
import {
  AllDatabaseDataContextProvider,
  useAllDatabaseDataContext
} from "lib/context/AllDatabaseDataContext";
import { useDisplayCurrency } from "lib/context/DisplaySettingsContext";
import { AllDatabaseData } from "lib/model/AllDatabaseDataModel";
import { Trip, tripModelFromDB } from "lib/model/Trip";
import { Income } from "lib/model/transaction/Income";
import {
  Expense,
  Transaction,
  isExpense,
  isIncome,
} from "lib/model/transaction/Transaction";
import {
  amountAllParties,
  amountOwnShare,
} from "lib/model/transaction/amounts";

function NonEmptyTripDetails(props: { trip: Trip }) {
  const { transactions: allTransactions } = useAllDatabaseDataContext();
  const displayCurrency = useDisplayCurrency();
  const { bankAccounts, stocks, exchange } = useAllDatabaseDataContext();
  const transactions = allTransactions
    .filter((tx): tx is Income | Expense => isIncome(tx) || isExpense(tx))
    .filter((tx) => tx.tripId == props.trip.id);

  const failedToExchange: Transaction[] = [];
  let fullAmount = AmountWithCurrency.zero(displayCurrency);
  let ownAmount = AmountWithCurrency.zero(displayCurrency);
  for (const t of transactions) {
    let failed = false;
    const all = amountAllParties(
      t,
      displayCurrency,
      bankAccounts,
      stocks,
      exchange,
    );
    if (all) {
      fullAmount = fullAmount.add(all);
    } else {
      failed = true;
      failedToExchange.push(t);
    }
    const own = amountOwnShare(
      t,
      displayCurrency,
      bankAccounts,
      stocks,
      exchange,
    );
    if (own) {
      ownAmount = ownAmount.add(own);
    } else if (!failed) {
      failedToExchange.push(t);
    }
  }
  return (
    <div>
      <AnchorLink href="/trips">Back to all trips</AnchorLink>
      <h1 className="text-xl leading-7">{props.trip.name}</h1>
      <CurrencyExchangeFailed failedTransactions={failedToExchange} />
      <div>Gross amount: {fullAmount.format()}</div>
      <div>
        Net amount, own share only: {ownAmount.format()} (
        {Math.round((100 * ownAmount.dollar()) / fullAmount.dollar())}%)
      </div>

      <h2 className="mt-4 text-xl leading-7">Expenses by category</h2>

      <ChildCategoryFullAmountChart title="Gross" transactions={transactions} />
      <ChildCategoryOwnShareChart title="Net" transactions={transactions} />

      <h2 className="mt-4 text-xl leading-7">
        Transactions ({transactions.length})
      </h2>

      <SortableTransactionsList
        transactions={transactions}
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
