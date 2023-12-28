import Layout from "components/Layout";
import {
  isFullyConfigured,
  NotConfiguredYet,
} from "components/NotConfiguredYet";
import { TransactionsList } from "components/transactions/TransactionsList";
import { AnchorLink, ButtonLink } from "components/ui/buttons";
import { EChartsOption } from "echarts";
import ReactEcharts from "echarts-for-react";
import { AmountWithCurrency } from "lib/AmountWithCurrency";
import {
  AllDatabaseDataContextProvider,
  useAllDatabaseDataContext,
} from "lib/ClientSideModel";
import { useDisplayCurrency } from "lib/displaySettings";
import { Trip } from "lib/model/Trip";
import { allDbDataProps } from "lib/ServerSideDB";
import { onTransactionChange } from "lib/stateHelpers";
import { InferGetServerSidePropsType } from "next";
import { useRouter } from "next/router";
import { useState } from "react";

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
  const {
    transactions: allTransactions,
    categories,
    setDbData,
  } = useAllDatabaseDataContext();
  const currency = useDisplayCurrency();
  const [sorting, setSorting] = useState(SortingMode.DATE_ASC);
  const transactions = allTransactions
    .filter((tx) => tx.hasTrip())
    .filter((tx) => tx.trip().id() == props.trip.id());
  const displayTransactions = [...transactions].sort((a, b) => {
    switch (sorting) {
      case SortingMode.AMOUNT_ASC:
        return (
          a.amountAllParties(currency).dollar() -
          b.amountAllParties(currency).dollar()
        );
      case SortingMode.AMOUNT_DESC:
        return (
          b.amountAllParties(currency).dollar() -
          a.amountAllParties(currency).dollar()
        );
      case SortingMode.DATE_ASC:
        return a.timestamp.getTime() - b.timestamp.getTime();
      case SortingMode.DATE_DESC:
        return b.timestamp.getTime() - a.timestamp.getTime();
      default:
        throw new Error("Unknown sorting mode: " + sorting);
    }
  });

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

  const defaultChartOptions: EChartsOption = {
    grid: {
      containLabel: true,
    },
    tooltip: {},
  };

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
          ...defaultChartOptions,
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
          ...defaultChartOptions,
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
        Transactions ({displayTransactions.length})
      </h2>

      <div className="mb-2 text-xs">
        Sort by{" "}
        <ButtonLink
          onClick={() =>
            setSorting(
              sorting == SortingMode.DATE_ASC
                ? SortingMode.DATE_DESC
                : SortingMode.DATE_ASC
            )
          }
        >
          date
        </ButtonLink>
        ,{" "}
        <ButtonLink
          onClick={() =>
            setSorting(
              sorting == SortingMode.AMOUNT_DESC
                ? SortingMode.AMOUNT_ASC
                : SortingMode.AMOUNT_DESC
            )
          }
        >
          amount
        </ButtonLink>
      </div>

      <div>
        <TransactionsList
          transactions={displayTransactions}
          onTransactionUpdated={onTransactionChange(setDbData)}
          displayLimit={10}
        />
      </div>
    </div>
  );
}
