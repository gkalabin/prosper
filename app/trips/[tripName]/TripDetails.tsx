"use client";
import { Trip as DBTrip } from "@prisma/client";
import {
  ChildCategoryFullAmountChart,
  ChildCategoryOwnShareChart,
} from "components/charts/CategoryPie";
import {
  isFullyConfigured,
  NotConfiguredYet,
} from "components/NotConfiguredYet";
import {
  SortableTransactionsList,
  SortingMode,
} from "components/transactions/SortableTransactionsList";
import { AnchorLink } from "components/ui/anchors";
import {
  AllDatabaseDataContextProvider,
  useAllDatabaseDataContext,
} from "lib/ClientSideModel";
import { useDisplayCurrency } from "lib/displaySettings";
import { AllDatabaseData } from "lib/model/AllDatabaseDataModel";
import {
  Expense,
  isExpense,
  isIncome,
} from "lib/model/transaction/Transaction";
import { amountOwnShare } from "lib/model/transaction/amounts";
import { amountAllParties } from "lib/model/transaction/amounts";
import { Income } from "lib/model/transaction/Income";
import { Trip, tripModelFromDB } from "lib/model/Trip";

function NonEmptyTripDetails(props: { trip: Trip }) {
  const { transactions: allTransactions } = useAllDatabaseDataContext();
  const displayCurrency = useDisplayCurrency();
  const { bankAccounts, stocks, exchange } = useAllDatabaseDataContext();
  const transactions = allTransactions
    .filter((tx): tx is Income | Expense => isIncome(tx) || isExpense(tx))
    .filter((tx) => tx.tripId == props.trip.id);

  const fullAmount = transactions
    .map((t) =>
      amountAllParties(t, displayCurrency, bankAccounts, stocks, exchange),
    )
    .reduce((a, b) => a.add(b));
  const ownAmount = transactions
    .map((t) =>
      amountOwnShare(t, displayCurrency, bankAccounts, stocks, exchange),
    )
    .reduce((a, b) => a.add(b));

  return (
    <div>
      <AnchorLink href="/trips">Back to all trips</AnchorLink>
      <h1 className="text-xl leading-7">{props.trip.name}</h1>
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
