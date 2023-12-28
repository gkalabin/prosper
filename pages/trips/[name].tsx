import Layout from "components/Layout";
import {
  isFullyConfigured,
  NotConfiguredYet,
} from "components/NotConfiguredYet";
import { SortableTransactionsList } from "components/transactions/SortableTransactionsList";
import { AnchorLink } from "components/ui/buttons";
import ReactEcharts from "echarts-for-react";
import { AmountWithCurrency } from "lib/AmountWithCurrency";
import { defaultPieChartOptions } from "lib/charts";
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

enum SortingMode {
  DATE_ASC,
  DATE_DESC,
  AMOUNT_ASC,
  AMOUNT_DESC,
}

function TripDetails(props: { trip: Trip }) {
  const { transactions: allTransactions, categories } =
    useAllDatabaseDataContext();
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

  const grossPerCategory = new Map<number, AmountWithCurrency>();
  const netPerCategory = new Map<number, AmountWithCurrency>();
  for (const t of transactions) {
    const cid = t.category.id();
    grossPerCategory.set(
      cid,
      t.amountAllParties(currency).add(grossPerCategory.get(cid))
    );
    netPerCategory.set(
      cid,
      t.amountOwnShare(currency).add(netPerCategory.get(cid))
    );
  }

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

      <ReactEcharts
        notMerge
        option={{
          ...defaultPieChartOptions(),
          title: {
            text: "Gross",
          },
          series: [
            {
              type: "pie",
              data: [...grossPerCategory.entries()].map(([cid, amount]) => ({
                name: categories.find((c) => c.id() == cid).nameWithAncestors(),
                value: amount.dollar(),
              })),
            },
          ],
        }}
      />

      <ReactEcharts
        notMerge
        option={{
          ...defaultPieChartOptions(),
          title: {
            text: "Net",
          },
          series: [
            {
              type: "pie",
              data: [...netPerCategory.entries()].map(([cid, amount]) => ({
                name: categories.find((c) => c.id() == cid).nameWithAncestors(),
                value: amount.dollar(),
              })),
            },
          ],
        }}
      />

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
