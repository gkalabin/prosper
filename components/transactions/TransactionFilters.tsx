import { FormikInput } from "components/forms/Input";
import { undoTailwindInputStyles } from "components/forms/Select";
import { ButtonFormSecondary } from "components/ui/buttons";
import { differenceInMilliseconds, startOfDay } from "date-fns";
import { useFormikContext } from "formik";
import { useAllDatabaseDataContext } from "lib/ClientSideModel";
import { Transaction } from "lib/model/Transaction";
import { TransactionType } from "lib/model/TransactionType";
import Select from "react-select";

export type FiltersFormValues = {
  freeTextSearch: string;
  transactionTypes: TransactionType[];
  vendor: string;
  timeFrom: string;
  timeTo: string;
  accountIds: number[];
  categoryIds: number[];
  includeChildrenCategories: boolean;
  tripId: number;
  tagNames: string[];
  allTagsShouldMatch: boolean;
};
export const initialTransactionFilters: FiltersFormValues = {
  freeTextSearch: "",
  transactionTypes: [
    TransactionType.PERSONAL,
    TransactionType.EXTERNAL,
    TransactionType.TRANSFER,
    TransactionType.INCOME,
  ],
  vendor: "",
  timeFrom: "",
  timeTo: "",
  accountIds: [],
  categoryIds: [],
  includeChildrenCategories: true,
  tripId: 0,
  tagNames: [],
  allTagsShouldMatch: false,
};

export function useFilteredTransactions() {
  const { transactions } = useAllDatabaseDataContext();
  const {
    values: {
      freeTextSearch,
      transactionTypes,
      vendor,
      accountIds,
      categoryIds,
      includeChildrenCategories,
      tripId,
      timeFrom,
      timeTo,
      tagNames,
      allTagsShouldMatch,
    },
  } = useFormikContext<FiltersFormValues>();
  const transactionMatchesFreeTextSearch = (t: Transaction) => {
    if (!freeTextSearch) {
      return true;
    }
    const lowerCaseSearch = freeTextSearch.toLocaleLowerCase();
    if (
      t.hasVendor() &&
      t.vendor().toLocaleLowerCase().includes(lowerCaseSearch)
    ) {
      return true;
    }
    if (t.description.toLocaleLowerCase().includes(lowerCaseSearch)) {
      return true;
    }
    if (
      t.hasPayer() &&
      t.payer().toLocaleLowerCase().includes(lowerCaseSearch)
    ) {
      return true;
    }
    if (t.hasOtherParty() && t.otherParty().includes(lowerCaseSearch)) {
      return true;
    }
    if (t.amt().dollar() == +freeTextSearch) {
      return true;
    }
    if (new RegExp(`\\b${t.id}\\b`).test(freeTextSearch)) {
      return true;
    }
    return false;
  };
  const sameDayOrBefore = (a: Date | string, b: Date | string) =>
    differenceInMilliseconds(
      startOfDay(new Date(a)),
      startOfDay(new Date(b))
    ) <= 0;
  return transactions
    .filter(transactionMatchesFreeTextSearch)
    .filter(
      (t) =>
        transactionTypes.some((tt) => t.matchesType(tt)) &&
        (vendor
          ? t.hasVendor() &&
            t.vendor().toLocaleLowerCase().includes(vendor.toLocaleLowerCase())
          : true) &&
        (accountIds?.length
          ? (t.hasAccountFrom() && accountIds.includes(t.accountFrom().id)) ||
            (t.hasAccountTo() && accountIds.includes(t.accountTo().id))
          : true) &&
        (categoryIds?.length
          ? categoryIds.some(
              (cid) =>
                t.category.id() == cid ||
                (includeChildrenCategories && t.category.childOf(cid))
            )
          : true) &&
        (tripId ? t.hasTrip() && t.trip().id() == tripId : true) &&
        (timeFrom ? sameDayOrBefore(timeFrom, t.timestamp) : true) &&
        (timeTo ? sameDayOrBefore(t.timestamp, timeTo) : true) &&
        (tagNames?.length
          ? allTagsShouldMatch
            ? tagNames.every((tn) => t.hasTag(tn))
            : tagNames.some((tn) => t.hasTag(tn))
          : true)
    );
}

export function SearchForAnythingInput() {
  return (
    <>
      <label
        htmlFor="freeTextSearch"
        className="block text-sm font-medium text-gray-700"
      >
        Search for anything
      </label>
      <FormikInput name="freeTextSearch" className="block w-full" />
    </>
  );
}

export function TransactionFiltersForm(props: { onClose: () => void }) {
  const { banks, categories, trips, tags } = useAllDatabaseDataContext();
  const {
    values: { transactionTypes, accountIds, categoryIds, tripId, tagNames },
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
    value: a.id(),
    label: a.nameWithAncestors(),
  }));
  const categoryOptionByValue = new Map<
    number,
    { value: number; label: string }
  >(categoryOptions.map((x) => [x.value, x]));

  const tripOptions = trips.map((a) => ({
    value: a.id(),
    label: a.name(),
  }));

  const tagNameOptions = tags.map((t) => ({
    value: t.name(),
    label: t.name(),
  }));

  const transactionTypeOptions = [
    { value: TransactionType.PERSONAL, label: "Personal" },
    { value: TransactionType.EXTERNAL, label: "External" },
    { value: TransactionType.TRANSFER, label: "Transfer" },
    { value: TransactionType.INCOME, label: "Income" },
  ];
  return (
    <>
      <div className="grid grid-cols-6 gap-6 bg-white p-2 shadow sm:rounded-md sm:p-6">
        <div className="col-span-6 text-xl font-medium leading-7">Filters</div>
        <div className="col-span-6">
          <label
            htmlFor="transactionTypes"
            className="block text-sm font-medium text-gray-700"
          >
            Transaction types
          </label>
          <Select
            instanceId={"transactionTypes"}
            styles={undoTailwindInputStyles()}
            options={transactionTypeOptions}
            isMulti
            value={transactionTypes.map((tt) => ({
              label: transactionTypeOptions.find(({ value }) => value == tt)
                .label,
              value: tt,
            }))}
            onChange={(x) =>
              setFieldValue(
                "transactionTypes",
                x.map((x) => x.value)
              )
            }
          />
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
            styles={undoTailwindInputStyles()}
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
            styles={undoTailwindInputStyles()}
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
            From
          </label>
          <FormikInput name="timeFrom" type="date" className="block w-full" />
        </div>
        <div className="col-span-6">
          <label
            htmlFor="timeTo"
            className="block text-sm font-medium text-gray-700"
          >
            To
          </label>
          <FormikInput name="timeTo" type="date" className="block w-full" />
        </div>
        <div className="col-span-6">
          <label
            htmlFor="tripId"
            className="block text-sm font-medium text-gray-700"
          >
            Trip
          </label>
          <Select
            styles={undoTailwindInputStyles()}
            options={tripOptions}
            value={tripOptions.find((x) => x.value == tripId)}
            onChange={(x) => setFieldValue("tripId", x.value)}
          />
        </div>
        <div className="col-span-6">
          <label
            htmlFor="tagNames"
            className="block text-sm font-medium text-gray-700"
          >
            Tags
          </label>
          <Select
            styles={undoTailwindInputStyles()}
            options={tagNameOptions}
            isMulti
            value={tagNames.map((x) => ({
              label: x,
              value: x,
            }))}
            onChange={(x) =>
              setFieldValue(
                "tagNames",
                x.map((x) => x.value)
              )
            }
          />
          <div className="ml-2 block">
            <label
              htmlFor="allTagsShouldMatch"
              className="text-sm font-medium text-gray-700"
            >
              Transaction should have all selected tags
            </label>
            <FormikInput
              name="allTagsShouldMatch"
              type="checkbox"
              className="ml-2"
            />
          </div>
        </div>

        <div className="col-span-6">
          <ButtonFormSecondary onClick={props.onClose}>
            Close
          </ButtonFormSecondary>
        </div>
      </div>
    </>
  );
}
