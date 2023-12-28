import {
  TransactionAPIRequest,
  TransactionAPIResponse,
} from "app/api/transaction/dbHelpers";
import { FormInputs } from "components/txform/FormInputs";
import { FormTypeSelect } from "components/txform/FormTypeSelect";
import { NewTransactionSuggestions } from "components/txform/NewTransactionSuggestions";
import {
  AddOrUpdateButtonText,
  FormikButtonFormPrimary,
  FormikButtonFormSecondary,
} from "components/ui/buttons";
import { format, startOfDay } from "date-fns";
import { Form, Formik, FormikHelpers } from "formik";
import {
  useAllDatabaseDataContext,
  useDisplayBankAccounts,
} from "lib/ClientSideModel";
import { uniqMostFrequent } from "lib/collections";
import { useDisplayCurrency } from "lib/displaySettings";
import { Currency } from "lib/model/Currency";
import { Tag } from "lib/model/Tag";
import { Trip } from "lib/model/Trip";
import {
  FormMode,
  TransactionFormValues,
} from "lib/model/forms/TransactionFormValues";
import { Income } from "lib/model/transaction/Income";
import { PersonalExpense } from "lib/model/transaction/PersonalExpense";
import { ThirdPartyExpense } from "lib/model/transaction/ThirdPartyExpense";
import {
  Transaction,
  otherPartyNameOrNull,
  parentTransactionId,
  transactionTags,
  transactionTrip,
} from "lib/model/transaction/Transaction";
import { Transfer } from "lib/model/transaction/Transfer";
import { ownShareAmountCentsIgnoreRefuds } from "lib/model/transaction/amounts";
import { TransactionPrototype } from "lib/txsuggestions/TransactionPrototype";
import { useState } from "react";

export function toDateTimeLocal(d: Date | number) {
  // 2022-12-19T18:05:59
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

export const formModeForTransaction = (t: Transaction) => {
  switch (t.kind) {
    case "PersonalExpense":
      return FormMode.PERSONAL;
    case "ThirdPartyExpense":
      return FormMode.EXTERNAL;
    case "Transfer":
      return FormMode.TRANSFER;
    case "Income":
      return FormMode.INCOME;
    default:
      const _exhaustiveCheck: never = t;
      throw new Error(`Unknown transaction type for ${_exhaustiveCheck}`);
  }
};

function initialValuesForPersonalExpense(
  t: PersonalExpense,
  mode: FormMode,
  displayCurrency: Currency,
  allTags: Tag[],
  allTrips: Trip[],
): TransactionFormValues {
  const defaults: TransactionFormValues = {
    mode,
    timestamp: toDateTimeLocal(t.timestampEpoch),
    description: t.note,
    vendor: t.vendor,
    otherPartyName: otherPartyNameOrNull(t) ?? "",
    amount: t.amountCents / 100,
    ownShareAmount: ownShareAmountCentsIgnoreRefuds(t) / 100,
    receivedAmount: t.amountCents / 100,
    fromBankAccountId: t.accountId,
    toBankAccountId: t.accountId,
    categoryId: t.categoryId,
    currencyCode: displayCurrency.code(),
    isShared: t.companions.length > 0,
    tripName: transactionTrip(t, allTrips)?.name ?? "",
    payer: t.vendor,
    tagNames: transactionTags(t, allTags).map((x) => x.name),
    parentTransactionId: 0,
  };
  return defaults;
}

function initialValuesForThirdPartyExpense(
  t: ThirdPartyExpense,
  mode: FormMode,
  allTags: Tag[],
  allTrips: Trip[],
  defaultAccountFrom: number,
  defaultAccountTo: number,
): TransactionFormValues {
  return {
    mode,
    timestamp: toDateTimeLocal(t.timestampEpoch),
    description: t.note,
    vendor: t.vendor,
    otherPartyName: otherPartyNameOrNull(t) ?? "",
    amount: t.amountCents / 100,
    ownShareAmount: ownShareAmountCentsIgnoreRefuds(t) / 100,
    receivedAmount: t.amountCents / 100,
    fromBankAccountId: defaultAccountFrom,
    toBankAccountId: defaultAccountTo,
    categoryId: t.categoryId,
    currencyCode: t.currencyCode,
    isShared: t.companions.length > 0,
    tripName: transactionTrip(t, allTrips)?.name ?? "",
    payer: t.payer,
    tagNames: transactionTags(t, allTags).map((x) => x.name),
    parentTransactionId: 0,
  };
}

function initialValuesForTransfer(
  t: Transfer,
  mode: FormMode,
  displayCurrency: Currency,
  allTags: Tag[],
): TransactionFormValues {
  return {
    mode,
    timestamp: toDateTimeLocal(t.timestampEpoch),
    description: t.note,
    vendor: "",
    otherPartyName: "",
    amount: t.sentAmountCents / 100,
    ownShareAmount: 0,
    receivedAmount: t.receivedAmountCents / 100,
    fromBankAccountId: t.fromAccountId,
    toBankAccountId: t.toAccountId,
    categoryId: t.categoryId,
    currencyCode: displayCurrency.code(),
    isShared: false,
    tripName: "",
    payer: "",
    tagNames: transactionTags(t, allTags).map((x) => x.name),
    parentTransactionId: 0,
  };
}

function initialValuesForIncome(
  t: Income,
  mode: FormMode,
  displayCurrency: Currency,
  allTags: Tag[],
  allTrips: Trip[],
): TransactionFormValues {
  return {
    mode,
    timestamp: toDateTimeLocal(t.timestampEpoch),
    description: t.note,
    vendor: t.payer,
    otherPartyName: otherPartyNameOrNull(t) ?? "",
    amount: t.amountCents / 100,
    ownShareAmount: ownShareAmountCentsIgnoreRefuds(t) / 100,
    receivedAmount: t.amountCents / 100,
    fromBankAccountId: t.accountId,
    toBankAccountId: t.accountId,
    categoryId: t.categoryId,
    currencyCode: displayCurrency.code(),
    isShared: t.companions.length > 0,
    tripName: transactionTrip(t, allTrips)?.name ?? "",
    payer: t.payer,
    tagNames: transactionTags(t, allTags).map((x) => x.name),
    parentTransactionId: parentTransactionId(t) ?? 0,
  };
}

function initialValuesForTransaction(
  t: Transaction,
  mode: FormMode,
  defaultAccountFrom: number,
  defaultAccountTo: number,
  displayCurrency: Currency,
  allTags: Tag[],
  allTrips: Trip[],
): TransactionFormValues {
  switch (t.kind) {
    case "PersonalExpense":
      return initialValuesForPersonalExpense(
        t,
        mode,
        displayCurrency,
        allTags,
        allTrips,
      );
    case "ThirdPartyExpense":
      return initialValuesForThirdPartyExpense(
        t,
        mode,
        allTags,
        allTrips,
        defaultAccountFrom,
        defaultAccountTo,
      );
    case "Transfer":
      return initialValuesForTransfer(t, mode, displayCurrency, allTags);
    case "Income":
      return initialValuesForIncome(
        t,
        mode,
        displayCurrency,
        allTags,
        allTrips,
      );
    default:
      const _exhaustiveCheck: never = t;
      throw new Error(`Unknown transaction type for ${_exhaustiveCheck}`);
  }
}

function initialValuesEmpty(
  mode: FormMode,
  defaultAccountFromId: number,
  defaultAccountToId: number,
  defaultCategoryId: number,
  displayCurrency: Currency,
): TransactionFormValues {
  const today = startOfDay(new Date());
  return {
    mode,
    timestamp: toDateTimeLocal(today),
    vendor: "",
    otherPartyName: "",
    description: "",
    amount: 0,
    ownShareAmount: 0,
    receivedAmount: 0,
    fromBankAccountId: defaultAccountFromId,
    toBankAccountId: defaultAccountToId,
    categoryId: defaultCategoryId,
    currencyCode: displayCurrency.code(),
    isShared: false,
    tripName: "",
    payer: "",
    tagNames: [],
    parentTransactionId: 0,
  };
}

export function mostUsedAccountFrom(txs: Transaction[]): number {
  const accounts = txs
    .map((x) => {
      if (x.kind == "Transfer") {
        return x.fromAccountId;
      }
      if (x.kind == "PersonalExpense") {
        return x.accountId;
      }
      return null;
    })
    .filter((x) => x);
  const [mostFrequent] = uniqMostFrequent(accounts);
  return mostFrequent;
}

export function mostUsedAccountTo(txs: Transaction[]): number {
  const accounts = txs
    .map((x) => {
      if (x.kind == "Transfer") {
        return x.toAccountId;
      }
      if (x.kind == "Income") {
        return x.accountId;
      }
      return null;
    })
    .filter((x) => x);
  const [mostFrequent] = uniqMostFrequent(accounts);
  return mostFrequent;
}

export function mostUsedCategoryId(txs: Transaction[], vendor: string): number {
  const categories = txs
    .filter((x) => {
      if (!vendor) {
        return true;
      }
      if (x.kind == "PersonalExpense" || x.kind == "ThirdPartyExpense") {
        return x.vendor == vendor;
      }
      if (x.kind == "Income") {
        return x.payer == vendor;
      }
      return false;
    })
    .map((x) => x.categoryId);
  const [mostFrequentCategory] = uniqMostFrequent(categories);
  return mostFrequentCategory;
}

export const AddTransactionForm = (props: {
  transaction?: Transaction;
  onAddedOrUpdated: (response: TransactionAPIResponse) => void;
  onClose: () => void;
}) => {
  const [apiError, setApiError] = useState("");
  const [prototype, setPrototype] = useState<TransactionPrototype>(null);
  const creatingNewTransaction = !props.transaction;
  const initialMode = props.transaction
    ? formModeForTransaction(props.transaction)
    : FormMode.PERSONAL;
  const {
    transactions,
    categories,
    tags: allTags,
    trips: allTrips,
  } = useAllDatabaseDataContext();
  const bankAccounts = useDisplayBankAccounts();
  const defaultAccountFrom =
    mostUsedAccountFrom(transactions) ?? bankAccounts[0].id;
  const defaultAccountTo =
    mostUsedAccountTo(transactions) ?? bankAccounts[0].id;
  const defaultCategory =
    mostUsedCategoryId(transactions, "") ?? categories[0].id();
  const displayCurrency = useDisplayCurrency();
  const initialValuesForEmptyForm = initialValuesEmpty(
    initialMode,
    defaultAccountFrom,
    defaultAccountTo,
    defaultCategory,
    displayCurrency,
  );
  const initialValues = !props.transaction
    ? initialValuesForEmptyForm
    : initialValuesForTransaction(
        props.transaction,
        initialMode,
        defaultAccountFrom,
        defaultAccountTo,
        displayCurrency,
        allTags,
        allTrips,
      );

  const submitNewTransaction = async (
    values: TransactionFormValues,
    { setSubmitting, resetForm }: FormikHelpers<TransactionFormValues>,
  ) => {
    const body: TransactionAPIRequest = {
      form: values,
      usedPrototype: null,
    };
    if (creatingNewTransaction) {
      body.usedPrototype = prototype;
    }
    await fetch(`/api/transaction/${props.transaction?.id ?? ""}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(async (added) => {
        // stop submitting before callback to avoid updating state on an unmounted component
        setSubmitting(false);
        const resetValues = { ...initialValuesForEmptyForm };
        resetValues.mode = values.mode;
        resetValues.timestamp = values.timestamp;
        resetValues.fromBankAccountId = values.fromBankAccountId;
        resetValues.toBankAccountId = values.toBankAccountId;
        resetValues.isShared = values.isShared;
        resetValues.otherPartyName = values.otherPartyName;
        resetValues.tripName = values.tripName;
        resetForm({ values: resetValues });
        setPrototype(null);
        props.onAddedOrUpdated(await added.json());
      })
      .catch((error) => {
        setSubmitting(false);
        console.log(error);
        setApiError(`Failed to add: ${error}`);
      });
  };

  return (
    <Formik initialValues={initialValues} onSubmit={submitNewTransaction}>
      <Form>
        <div className="shadow sm:rounded-md">
          <div className="bg-white p-2 sm:p-6">
            {creatingNewTransaction && (
              <div className="mb-2">
                <NewTransactionSuggestions
                  activePrototype={prototype}
                  onItemClick={setPrototype}
                />
              </div>
            )}

            <div className="grid grid-cols-6 gap-x-6 gap-y-3">
              <FormTypeSelect />
              <FormInputs
                transaction={props.transaction}
                prototype={prototype}
              />
            </div>
          </div>

          {apiError && (
            <div className="bg-gray-50 px-4 pt-3 text-left text-red-700 sm:px-6">
              <span className="font-bold">Error: </span> {apiError}
            </div>
          )}

          <div className="flex justify-end gap-2 bg-gray-50 px-4 py-3 sm:px-6">
            <FormikButtonFormSecondary
              className="self-start"
              onClick={props.onClose}
            >
              Cancel
            </FormikButtonFormSecondary>
            <FormikButtonFormPrimary className="self-start" type="submit">
              <AddOrUpdateButtonText add={creatingNewTransaction} />
            </FormikButtonFormPrimary>
          </div>
        </div>
      </Form>
    </Formik>
  );
};
