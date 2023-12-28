import {
  ChildCategoryFullAmountChart,
  ChildCategoryOwnShareChart,
} from "components/charts/CategoryPie";
import Layout from "components/Layout";
import {
  isFullyConfigured,
  NotConfiguredYet,
} from "components/NotConfiguredYet";
import {
  SortableTransactionsList,
  SortingMode,
} from "components/transactions/SortableTransactionsList";
import { AnchorLink } from "components/ui/buttons";
import {
  AllDatabaseDataContextProvider,
  useAllDatabaseDataContext,
} from "lib/ClientSideModel";
import { useDisplayCurrency } from "lib/displaySettings";
import { Trip } from "lib/model/Trip";
import { allDbDataProps } from "lib/ServerSideDB";
import { InferGetServerSidePropsType } from "next";
import { useRouter } from "next/router";

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

function PageLayout() {
  const { trips } = useAllDatabaseDataContext();
  const router = useRouter();
  const trip = trips.find((t) => t.name() == router.query.name);
  if (!trip) {
    router.push({ pathname: "/trips" });
    return <></>;
  }
  return (
    <Layout>
      <TripDetails trip={trip} />
    </Layout>
  );
}

function TripDetails(props: { trip: Trip }) {
  const { transactions: allTransactions } = useAllDatabaseDataContext();
  const currency = useDisplayCurrency();
  const transactions = allTransactions
    .filter((tx) => tx.hasTrip())
    .filter((tx) => tx.trip().id() == props.trip.id());

  const fullAmount = transactions
    .map((t) => t.amountAllParties(currency))
    .reduce((a, b) => a.add(b));
  const ownAmount = transactions
    .map((t) => t.amountOwnShare(currency))
    .reduce((a, b) => a.add(b));

  return (
    <div>
      <AnchorLink href="/trips">Back to all trips</AnchorLink>
      <h1 className="text-xl leading-7">{props.trip.name()}</h1>
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
