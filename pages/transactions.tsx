import { ChartPieIcon, FunnelIcon } from "@heroicons/react/24/outline";
import Layout from "components/Layout";
import {
  NotConfiguredYet,
  isFullyConfigured,
} from "components/NotConfiguredYet";
import {
  SearchForAnythingInput,
  TransactionFiltersForm,
  initialTransactionFilters,
  useFilteredTransactions,
} from "components/transactions/TransactionFilters";
import { TransactionStats } from "components/transactions/TransactionStats";
import { TransactionsList } from "components/transactions/TransactionsList";
import { ButtonPagePrimary } from "components/ui/buttons";
import { Formik } from "formik";
import {
  AllDatabaseDataContextProvider,
  useAllDatabaseDataContext,
} from "lib/ClientSideModel";
import { allDbDataProps } from "lib/ServerSideDB";
import { onTransactionChange } from "lib/stateHelpers";
import { InferGetServerSidePropsType } from "next";
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
      <Layout>
        <Formik onSubmit={null} initialValues={initialTransactionFilters}>
          <PageContent />
        </Formik>
      </Layout>
    </AllDatabaseDataContextProvider>
  );
}

function PageContent() {
  const [showFiltersForm, setShowFiltersForm] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const filteredTransactions = useFilteredTransactions();
  const { setDbData } = useAllDatabaseDataContext();
  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-4">
        <ButtonPagePrimary onClick={() => setShowFiltersForm(!showFiltersForm)}>
          <FunnelIcon className="mr-2 inline h-4 w-4" />
          Filters
        </ButtonPagePrimary>
        <ButtonPagePrimary onClick={() => setShowStats(!showStats)}>
          <ChartPieIcon className="mr-2 inline h-4 w-4" />
          Stats
        </ButtonPagePrimary>
      </div>
      {showFiltersForm && (
        <TransactionFiltersForm onClose={() => setShowFiltersForm(false)} />
      )}
      <div className="w-full">
        <SearchForAnythingInput />
      </div>
      {showStats && (
        <TransactionStats
          transactions={filteredTransactions}
          onClose={() => setShowStats(false)}
        />
      )}
      <TransactionsList
        transactions={filteredTransactions}
        onTransactionUpdated={onTransactionChange(setDbData)}
      />
    </div>
  );
}
