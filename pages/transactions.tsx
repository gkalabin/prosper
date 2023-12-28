import { FunnelIcon } from "@heroicons/react/24/outline";
import { FormikInput } from "components/forms/Input";
import Layout from "components/Layout";
import {
  isFullyConfigured,
  NotConfiguredYet,
} from "components/NotConfiguredYet";
import { TransactionsList } from "components/transactions/TransactionsList";
import { ButtonFormSecondary, ButtonPagePrimary } from "components/ui/buttons";
import { differenceInMilliseconds } from "date-fns";
import { Formik, useFormikContext } from "formik";
import {
  AllDatabaseDataContextProvider,
  modelFromDatabaseData,
  useAllDatabaseDataContext,
} from "lib/ClientSideModel";
import { matchesWithAncestors } from "lib/model/Category";
import { allDbDataProps } from "lib/ServerSideDB";
import { onTransactionChange } from "lib/stateHelpers";
import { InferGetServerSidePropsType } from "next";
import { useState } from "react";
import Select from "react-select";

export const getServerSideProps = allDbDataProps;

export default function TransactionsPageLayout(
  dbData: InferGetServerSidePropsType<typeof getServerSideProps>
) {
  const [dbDataState, setDbData] = useState(dbData);
  if (!isFullyConfigured(dbData)) {
    return <NotConfiguredYet />;
  }
  return (
    <Layout>
      <AllDatabaseDataContextProvider init={modelFromDatabaseData(dbDataState)}>
        <Formik
          onSubmit={null}
          initialValues={{
            vendor: "",
            timeFrom: "",
            timeTo: "",
            accountIds: [],
            categoryIds: [],
            includeChildrenCategories: true,
          }}
        >
          <>
            <div className="mb-4">
              <Filters />
            </div>

            <FilteredTransactionsList
              onTransactionChange={onTransactionChange(setDbData)}
            />
          </>
        </Formik>
      </AllDatabaseDataContextProvider>
    </Layout>
  );
}

type FiltersFormValues = {
  vendor: string;
  timeFrom: string;
  timeTo: string;
  accountIds: number[];
  categoryIds: number[];
  includeChildrenCategories: boolean;
  tripId: number;
};

function FilteredTransactionsList({ onTransactionChange }) {
  const { transactions } = useAllDatabaseDataContext();
  const {
    values: {
      vendor,
      accountIds,
      categoryIds,
      includeChildrenCategories,
      tripId,
      timeFrom,
      timeTo,
    },
  } = useFormikContext<FiltersFormValues>();
  const displayTransactions = transactions.filter(
    (t) =>
      (vendor
        ? t.hasVendor() && t.vendor().toLocaleLowerCase().includes(vendor)
        : true) &&
      (accountIds?.length
        ? (t.hasAccountFrom() && accountIds.includes(t.accountFrom().id)) ||
          (t.hasAccountTo() && accountIds.includes(t.accountTo().id))
        : true) &&
      (categoryIds?.length
        ? includeChildrenCategories
          ? categoryIds.some((cid) => matchesWithAncestors(t.category, cid))
          : categoryIds.includes(t.category.id)
        : true) &&
      (tripId ? t.hasTrip() && t.trip().id() == tripId : true) &&
      (timeFrom
        ? Math.abs(differenceInMilliseconds(new Date(timeFrom), t.timestamp)) <
          1
        : true) &&
      (timeTo
        ? Math.abs(differenceInMilliseconds(new Date(timeTo), t.timestamp)) < 1
        : true)
  );
  return (
    <TransactionsList
      transactions={displayTransactions}
      onTransactionUpdated={onTransactionChange}
    />
  );
}

function Filters() {
  const [showFilters, setShowFilters] = useState(false);
  const { banks, categories } = useAllDatabaseDataContext();
  const {
    values: { accountIds, categoryIds },
    setFieldValue,
  } = useFormikContext<FiltersFormValues>();
  const bankAccountOptions = banks
    .flatMap((x) => x.accounts)
    .filter((x) => !x.isArchived())
    .map((a) => ({
      value: a.id,
      label: `${a.bank.name}: ${a.name}`,
    }));
  const bankAccountOptionByValue = new Map<
    number,
    { value: number; label: string }
  >(bankAccountOptions.map((x) => [x.value, x]));

  const categoryOptions = categories.map((a) => ({
    value: a.id,
    label: a.nameWithAncestors,
  }));
  const categoryOptionByValue = new Map<
    number,
    { value: number; label: string }
  >(categoryOptions.map((x) => [x.value, x]));

  return (
    <>
      {!showFilters && (
        <div className="flex justify-end">
          <ButtonPagePrimary onClick={() => setShowFilters(true)}>
            <FunnelIcon className="mr-2 inline h-4 w-4" />
            Filters
          </ButtonPagePrimary>
        </div>
      )}
      {showFilters && (
        <div className="grid grid-cols-6 gap-6 bg-white p-2 shadow sm:rounded-md sm:p-6">
          <div className="col-span-6 text-xl font-medium leading-7">
            Filters
          </div>
          <div className="col-span-6">
            <label
              htmlFor="vendor"
              className="block text-sm font-medium text-gray-700"
            >
              Vendor
            </label>
            <FormikInput name="vendor" className="block w-full" />
          </div>
          <div className="col-span-6">
            <label
              htmlFor="accountIds"
              className="block text-sm font-medium text-gray-700"
            >
              Account
            </label>
            <Select
              options={bankAccountOptions}
              isMulti
              value={accountIds.map((x) => ({
                label: bankAccountOptionByValue.get(x).label,
                value: x,
              }))}
              onChange={(x) =>
                setFieldValue(
                  "accountIds",
                  x.map((x) => x.value)
                )
              }
            />
          </div>
          <div className="col-span-6">
            <label
              htmlFor="categoryIds"
              className="block text-sm font-medium text-gray-700"
            >
              Category
            </label>
            <Select
              options={categoryOptions}
              isMulti
              value={categoryIds.map((x) => ({
                label: categoryOptionByValue.get(x).label,
                value: x,
              }))}
              onChange={(x) =>
                setFieldValue(
                  "categoryIds",
                  x.map((x) => x.value)
                )
              }
            />
            <div className="ml-2 block">
              <label
                htmlFor="includeChildrenCategories"
                className="text-sm font-medium text-gray-700"
              >
                Include subcategories
              </label>
              <FormikInput
                name="includeChildrenCategories"
                type="checkbox"
                className="ml-2"
              />
            </div>
          </div>
          <div className="col-span-6">
            <label
              htmlFor="timeFrom"
              className="block text-sm font-medium text-gray-700"
            >
              Time From
            </label>
            <FormikInput
              name="timeFrom"
              type="datetime-local"
              className="block w-full"
            />
          </div>
          <div className="col-span-6">
            <label
              htmlFor="timeTo"
              className="block text-sm font-medium text-gray-700"
            >
              Time To
            </label>
            <FormikInput
              name="timeTo"
              type="datetime-local"
              className="block w-full"
            />
          </div>
          <div className="col-span-6">
            <ButtonFormSecondary onClick={() => setShowFilters(false)}>
              Close
            </ButtonFormSecondary>
          </div>
        </div>
      )}
    </>
  );
}
