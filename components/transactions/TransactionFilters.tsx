import { FormikInput } from "components/forms/Input";
import { undoTailwindInputStyles } from "components/forms/Select";
import { ButtonFormSecondary } from "components/ui/buttons";
import { differenceInMilliseconds, startOfDay } from "date-fns";
import { useFormikContext } from "formik";
import { useAllDatabaseDataContext } from "lib/ClientSideModel";
import { fullAccountName } from "lib/model/BankAccount";
import { transactionIsDescendant } from "lib/model/Category";
import {
  Transaction,
  isExpense,
  isIncome,
  isPersonalExpense,
  isTransfer,
  otherPartyNameOrNull,
} from "lib/model/transaction/Transaction";
import Select from "react-select";

type TransactionType =
  | "PersonalExpense"
  | "ThirdPartyExpense"
  | "Transfer"
  | "Income";

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
  tagIds: number[];
  allTagsShouldMatch: boolean;
};
export const initialTransactionFilters: FiltersFormValues = {
  freeTextSearch: "",
  transactionTypes: [
    "PersonalExpense",
    "ThirdPartyExpense",
    "Transfer",
    "Income",
  ],
  vendor: "",
  timeFrom: "",
  timeTo: "",
  accountIds: [],
  categoryIds: [],
  includeChildrenCategories: true,
  tripId: 0,
  tagIds: [],
  allTagsShouldMatch: false,
};

export function useFilteredTransactions() {
  const { transactions, categories } = useAllDatabaseDataContext();
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
      tagIds,
      allTagsShouldMatch,
    },
  } = useFormikContext<FiltersFormValues>();
  const transactionMatchesFreeTextSearch = (t: Transaction) => {
    if (!freeTextSearch) {
      return true;
    }
    const lowerCaseSearch = freeTextSearch.toLocaleLowerCase();
    if (
      isExpense(t) &&
      t.vendor.toLocaleLowerCase().includes(lowerCaseSearch)
    ) {
      return true;
    }
    if (t.note.toLocaleLowerCase().includes(lowerCaseSearch)) {
      return true;
    }
    if (isIncome(t) && t.payer.toLocaleLowerCase().includes(lowerCaseSearch)) {
      return true;
    }
    if (otherPartyNameOrNull(t)?.includes(lowerCaseSearch)) {
      return true;
    }
    if (
      (isExpense(t) || isIncome(t)) &&
      t.amountCents / 100 == +freeTextSearch
    ) {
      return true;
    }
    if (
      isTransfer(t) &&
      (t.sentAmountCents / 100 == +freeTextSearch ||
        t.receivedAmountCents / 100 == +freeTextSearch)
    ) {
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
        transactionTypes.some((tt) => t.kind == tt) &&
        (vendor
          ? isExpense(t) &&
            t.vendor.toLocaleLowerCase().includes(vendor.toLocaleLowerCase())
          : true) &&
        (accountIds?.length
          ? ((isPersonalExpense(t) || isIncome(t)) &&
              accountIds.includes(t.accountId)) ||
            (isTransfer(t) &&
              (accountIds.includes(t.fromAccountId) ||
                accountIds.includes(t.toAccountId)))
          : true) &&
        (categoryIds?.length
          ? categoryIds.some(
              (cid) =>
                t.categoryId == cid ||
                (includeChildrenCategories &&
                  transactionIsDescendant(t, cid, categories))
            )
          : true) &&
        (tripId ? (isExpense(t) || isIncome(t)) && t.tripId == tripId : true) &&
        (timeFrom
          ? sameDayOrBefore(timeFrom, new Date(t.timestampEpoch))
          : true) &&
        (timeTo ? sameDayOrBefore(new Date(t.timestampEpoch), timeTo) : true) &&
        (tagIds?.length
          ? allTagsShouldMatch
            ? tagIds.every((tagId) => t.tagsIds.includes(tagId))
            : tagIds.some((tagId) => t.tagsIds.includes(tagId))
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
  const { banks, bankAccounts, categories, trips, tags } =
    useAllDatabaseDataContext();
  const {
    values: { transactionTypes, accountIds, categoryIds, tripId, tagIds },
    setFieldValue,
  } = useFormikContext<FiltersFormValues>();
  const bankAccountOptions = bankAccounts.map((a) => ({
    value: a.id,
    label: `${fullAccountName(a, banks)}` + (a.archived ? " (archived)" : ""),
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
    value: a.id,
    label: a.name,
  }));

  const tagIdOptions = tags.map((t) => ({
    value: t.id,
    label: t.name,
  }));

  const transactionTypeOptions: { value: TransactionType; label: string }[] = [
    { value: "PersonalExpense", label: "Personal" },
    { value: "ThirdPartyExpense", label: "External" },
    { value: "Transfer", label: "Transfer" },
    { value: "Income", label: "Income" },
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
            htmlFor="tagIds"
            className="block text-sm font-medium text-gray-700"
          >
            Tags
          </label>
          <Select
            styles={undoTailwindInputStyles()}
            options={tagIdOptions}
            isMulti
            value={tagIds.map((x) => ({
              label: tags.find((t) => t.id == x).name,
              value: x,
            }))}
            onChange={(x) =>
              setFieldValue(
                "tagIds",
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
