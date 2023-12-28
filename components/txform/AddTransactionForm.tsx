import { FormTransactionTypeSelector } from "components/txform/FormTransactionTypeSelector";
import {
  NewTransactionSuggestions,
  TransactionPrototype
} from "components/txform/NewTransactionSuggestions";
import { ButtonFormPrimary, ButtonFormSecondary } from "components/ui/buttons";
import { format } from "date-fns";
import { Form, Formik, FormikHelpers } from "formik";
import { useAllDatabaseDataContext } from "lib/ClientSideModel";
import { BankAccount } from "lib/model/BankAccount";
import { Category } from "lib/model/Category";
import { Currency } from "lib/model/Currency";
import { Transaction } from "lib/model/Transaction";
import {
  AddTransactionFormValues,
  FormMode,
  TransactionAPIRequest,
  TransactionAPIResponse
} from "lib/transactionCreation";
import { useState } from "react";
import { FormInputs } from "./FormInputs";

export function toDateTimeLocal(d: Date) {
  // 2022-12-19T18:05:59
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

export const formModeForTransaction = (t: Transaction) => {
  if (!t) {
    throw new Error("No transaction provided");
  }
  if (t.isPersonalExpense()) {
    return FormMode.PERSONAL;
  }
  if (t.isThirdPartyExpense()) {
    return FormMode.EXTERNAL;
  }
  if (t.isTransfer()) {
    return FormMode.TRANSFER;
  }
  if (t.isIncome()) {
    return FormMode.INCOME;
  }
  throw new Error(`Unknown transaction type for ${t}`);
};

function initialValuesForTransaction(
  t: Transaction,
  mode: FormMode,
  defaultAccountFrom: BankAccount,
  defaultAccountTo: BankAccount
): AddTransactionFormValues {
  const defaults: AddTransactionFormValues = {
    mode,
    timestamp: toDateTimeLocal(t.timestamp),
    description: t.description,
    vendor: t.hasVendor() ? t.vendor() : "",
    amount: t.amount().dollar(),
    ownShareAmount: t.amount().dollar(),
    receivedAmount: t.isTransfer()
      ? t.amountReceived().dollar()
      : t.amount().dollar(),
    fromBankAccountId: (t.accountFrom() ?? defaultAccountFrom).id,
    toBankAccountId: (t.accountTo() ?? defaultAccountTo).id,
    categoryId: t.category.id,
    currencyId: t.currency().id,
    isFamilyExpense: t.isFamilyExpense(),
    tripName: t.hasTrip() ? t.trip().name() : "",
    payer: t.hasPayer() ? t.payer() : "",
    tagNames: t.tags().map((x) => x.name()),
    parentTransactionId: t.hasParentTransaction() ? t.parentTransactionId() : 0,
  };
  if (t.isPersonalExpense() || t.isThirdPartyExpense() || t.isIncome()) {
    defaults.ownShareAmount = t.amountOwnShare().dollar();
  }
  return defaults;
}

function initialValuesEmpty(
  mode: FormMode,
  defaultAccountFrom: BankAccount,
  defaultAccountTo: BankAccount,
  defaultCategory: Category,
  defaultCurrency: Currency
): AddTransactionFormValues {
  return {
    mode,
    timestamp: toDateTimeLocal(new Date()),
    vendor: "",
    description: "",
    amount: 0,
    ownShareAmount: 0,
    receivedAmount: 0,
    fromBankAccountId: defaultAccountFrom.id,
    toBankAccountId: defaultAccountTo.id,
    categoryId: defaultCategory.id,
    currencyId: defaultCurrency.id,
    isFamilyExpense: false,
    tripName: "",
    payer: "",
    tagNames: [],
    parentTransactionId: 0,
  };
}

export function mostUsedAccountFrom(txs: Transaction[]): BankAccount {
  const accounts = txs
    .filter((x) => x.hasAccountFrom())
    .map((x) => x.accountFrom());
  return mostFrequent(accounts);
}

export function mostUsedAccountTo(txs: Transaction[]): BankAccount {
  const accounts = txs
    .filter((x) => x.hasAccountTo())
    .map((x) => x.accountTo());
  return mostFrequent(accounts);
}

function mostUsedCurrency(txs: Transaction[]): Currency {
  const currencies = txs
    .filter((x) => x.isThirdPartyExpense())
    .map((x) => x.currency());
  return mostFrequent(currencies);
}

export function mostUsedCategory(txs: Transaction[], vendor: string): Category {
  const categories = txs
    .filter((x) => (vendor ? x.hasVendor() && x.vendor() == vendor : true))
    .map((x) => x.category);
  return mostFrequent(categories);
}

function mostFrequent<T extends { id: number }>(items: T[]): T {
  if (!items.length) {
    return null;
  }
  const itemById = {};
  const frequencyById: { [id: number]: number } = {};
  items.forEach((x) => {
    itemById[x.id] = x;
    frequencyById[x.id] ??= 0;
    frequencyById[x.id]++;
  });
  const mostFrequentId = Object.entries(frequencyById).sort(
    (a, b) => b[1] - a[1]
  )[0][0];
  return itemById[mostFrequentId];
}

export const AddTransactionForm = (props: {
  transaction?: Transaction;
  onAddedOrUpdated: (response: TransactionAPIResponse) => void;
  onClose: () => void;
}) => {
  const [apiError, setApiError] = useState("");
  const [isAdvancedMode, setAdvancedMode] = useState(false);
  const [prototype, setPrototype] = useState<TransactionPrototype>(null);
  const creatingNewTransaction = !props.transaction;
  const initialMode = props.transaction
    ? formModeForTransaction(props.transaction)
    : FormMode.PERSONAL;
  const { transactions } = useAllDatabaseDataContext();
  const defaultAccountFrom = mostUsedAccountFrom(transactions);
  const defaultAccountTo = mostUsedAccountTo(transactions);
  const defaultCategory = mostUsedCategory(transactions, "");
  const defaultCurrency = mostUsedCurrency(transactions);
  const initialValuesForEmptyForm = initialValuesEmpty(
    initialMode,
    defaultAccountFrom,
    defaultAccountTo,
    defaultCategory,
    defaultCurrency
  );
  const initialValues = !props.transaction
    ? initialValuesForEmptyForm
    : initialValuesForTransaction(
        props.transaction,
        initialMode,
        defaultAccountFrom,
        defaultAccountTo
      );

  const submitNewTransaction = async (
    values: AddTransactionFormValues,
    { setSubmitting, resetForm }: FormikHelpers<AddTransactionFormValues>
  ) => {
    const body: TransactionAPIRequest = {
      form: values,
      usedOpenBankingTransactions: [],
      suggestedVendor: prototype?.vendor,
    };
    const creatingNewTransaction = !props.transaction;
    if (creatingNewTransaction) {
      body.usedOpenBankingTransactions = [
        prototype?.openBankingTransaction,
        prototype?.openBankingTransaction2,
      ].filter((x) => !!x);
    }
    await fetch(`/api/transaction/${props.transaction?.id ?? ""}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(async (added) => {
        // stop submitting before callback to avoid updating state on an unmounted component
        setSubmitting(false);
        resetForm({ values: initialValuesForEmptyForm });
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
    <div>
      <Formik initialValues={initialValues} onSubmit={submitNewTransaction}>
        {({ isSubmitting, setFieldValue, values }) => (
          <Form>
            <div className="overflow-hidden shadow sm:rounded-md">
              <div className="bg-white p-2 sm:p-6">
                <div className="mb-2">
                  <NewTransactionSuggestions
                    onItemClick={(t) => {
                      if (isSubmitting) {
                        // The form is disabled while being submitted, so do not change it through suggestions either.
                        return;
                      }
                      setPrototype(t);
                      setFieldValue("mode", t.mode);
                    }}
                  />
                </div>

                <FormTransactionTypeSelector
                  disabled={isSubmitting}
                  mode={values.mode}
                  setMode={(m) => setFieldValue("mode", m)}
                >
                  <FormInputs
                    transaction={props.transaction}
                    prototype={prototype}
                    isAdvancedMode={isAdvancedMode}
                  />
                </FormTransactionTypeSelector>
              </div>

              {apiError && (
                <div className="bg-gray-50 px-4 pt-3 text-left text-red-700 sm:px-6">
                  <span className="font-bold">Error: </span> {apiError}
                </div>
              )}

              <div className="flex justify-end gap-2 bg-gray-50 px-4 py-3 sm:px-6">
                <ButtonFormSecondary
                  className="self-start"
                  onClick={() => setAdvancedMode(!isAdvancedMode)}
                  disabled={isSubmitting}
                >
                  Advanced
                </ButtonFormSecondary>

                <ButtonFormSecondary
                  className="self-start"
                  onClick={props.onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </ButtonFormSecondary>

                <ButtonFormPrimary
                  className="self-start"
                  disabled={isSubmitting}
                  type="submit"
                >
                  {creatingNewTransaction
                    ? isSubmitting
                      ? "Adding…"
                      : "Add"
                    : isSubmitting
                    ? "Updating…"
                    : "Update"}
                </ButtonFormPrimary>
              </div>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};
