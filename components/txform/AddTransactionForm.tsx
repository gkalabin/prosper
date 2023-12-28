import { Switch } from "@headlessui/react";
import {
  Transaction as DBTransaction,
  TransactionPrototype as DBTransactionPrototype
} from "@prisma/client";
import classNames from "classnames";
import {
  Input,
  MoneyInputWithLabel,
  TextInputWithLabel
} from "components/forms/Input";
import { BankAccountSelect } from "components/txform/BankAccountSelect";
import { FormTransactionTypeSelector } from "components/txform/FormTransactionTypeSelector";
import { NewTransactionSuggestions, TransactionPrototype } from "components/txform/NewTransactionSuggestions";
import { SelectNumber } from "components/txform/Select";
import {
  ButtonFormPrimary,
  ButtonFormSecondary
} from "components/ui/buttons";
import {
  format,
  isBefore
} from "date-fns";
import { Form, Formik, FormikHelpers, useFormikContext } from "formik";
import {
  useAllDatabaseDataContext
} from "lib/ClientSideModel";
import { BankAccount } from "lib/model/BankAccount";
import { Category } from "lib/model/Category";
import { Currency } from "lib/model/Currency";
import { Transaction } from "lib/model/Transaction";
import { Trip } from "lib/model/Trip";
import {
  IOBTransactionsByAccountId
} from "lib/openbanking/interface";
import {
  AddTransactionFormValues,
  FormMode
} from "lib/transactionCreation";
import { useEffect, useState } from "react";

export const InputRow = (props: {
  mode?: FormMode;
  modes?: FormMode[];
  children: JSX.Element | JSX.Element[];
}) => {
  const field = (
    // To make 2 columns: <div className="col-span-6 sm:col-span-3">
    <div className="col-span-6">{props.children}</div>
  );
  if (!props.modes || props.modes.includes(props.mode)) {
    return field;
  }
  return <></>;
};

export function toDateTimeLocal(d: Date) {
  // 2022-12-19T18:05:59
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

const formModeForTransaction = (t: Transaction) => {
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
    receivedAmount: t.isTransfer() ? t.amountReceived().dollar() : t.amount().dollar(),
    fromBankAccountId: (t.accountFrom() ?? defaultAccountFrom).id,
    toBankAccountId: (t.accountTo() ?? defaultAccountTo).id,
    categoryId: t.category.id,
    currencyId: t.currency().id,
    isFamilyExpense: t.isFamilyExpense(),
    tripName: t.hasTrip() ? t.trip().name() : "",
    payer: t.hasPayer() ? t.payer() : "",
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
  };
}

function mostUsedAccountFrom(txs: Transaction[]): BankAccount {
  const accounts = txs
    .filter((x) => x.hasAccountFrom())
    .map((x) => x.accountFrom());
  return mostFrequent(accounts);
}

function mostUsedAccountTo(txs: Transaction[]): BankAccount {
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

function mostUsedCategory(
  txs: Transaction[],
  vendor: string
): Category {
  const categories = txs
    .filter((x) => vendor ? x.hasVendor() && x.vendor() == vendor : true)
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
  openBankingTransactions?: IOBTransactionsByAccountId;
  transactionPrototypes?: DBTransactionPrototype[];
  onAdded: (added: DBTransaction) => void;
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
    await fetch(`/api/transaction/${props.transaction?.id ?? ""}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })
      .then(async (added) => {
        // stop submitting before callback to avoid updating state on an unmounted component
        setSubmitting(false);
        resetForm({ values: initialValuesForEmptyForm });
        setPrototype(null);
        props.onAdded(await added.json());
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
                    openBankingTransactions={props.openBankingTransactions}
                    transactionPrototypes={props.transactionPrototypes}
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

              <div className="flex justify-end gap-2 bg-gray-50 px-4 py-3 sm:px-6">
                {apiError && (
                  <div className="grow text-left text-red-700">{apiError}</div>
                )}

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

const FormInputs = (props: {
  transaction: Transaction;
  isAdvancedMode: boolean;
  prototype: TransactionPrototype;
}) => {
  const { transactions, currencies, categories, banks, trips } = useAllDatabaseDataContext();
  const {
    values: {
      amount,
      vendor,
      timestamp,
      isFamilyExpense,
      fromBankAccountId,
      mode,
    },
    setFieldValue,
    handleChange,
    isSubmitting,
  } = useFormikContext<AddTransactionFormValues>();

  useEffect(() => {
    setFieldValue("ownShareAmount", isFamilyExpense ? amount / 2 : amount);
  }, [amount, isFamilyExpense, setFieldValue]);
  useEffect(() => {
    setFieldValue("receivedAmount", amount);
  }, [amount, setFieldValue]);

  useEffect(() => {
    if (!props.prototype) {
      return;
    }
    setFieldValue("vendor", props.prototype.vendor);
    setFieldValue("amount", Math.abs(props.prototype.amount));
    setFieldValue("timestamp", toDateTimeLocal(props.prototype.timestamp));
    if (props.prototype.accountFromId) {
      setFieldValue("fromBankAccountId", props.prototype.accountFromId);
    }
    if (props.prototype.accountToId) {
      setFieldValue("toBankAccountId", props.prototype.accountToId);
    }
  }, [props.prototype, setFieldValue]);

  useEffect(() => {
    if (props.transaction || props.prototype) {
      // Is we are editing transaction, do not autofill from/to bank account, but stick to the one from transaction.
      // If there is a prototype (suggestion from banking API), do not mess with bank account selector either.
      return;
    }
    setFieldValue("fromBankAccountId", mostUsedAccountFrom(transactions).id);
    setFieldValue("toBankAccountId", mostUsedAccountTo(transactions).id);
  }, [transactions, mode, setFieldValue, props.transaction, props.prototype]);

  useEffect(() => {
    const suggestion = mostUsedCategory(transactions, vendor);
    if (suggestion) {
      setFieldValue("categoryId", suggestion.id);
    }
  }, [vendor, transactions, mode, setFieldValue]);

  useEffect(() => {
    if (mode == FormMode.PERSONAL) {
      const account = banks
        .flatMap((b) => b.accounts)
        .find((a) => a.id == fromBankAccountId);
      setFieldValue("isFamilyExpense", account.isJoint());
    }
  }, [mode, setFieldValue, banks, fromBankAccountId]);

  const transactionsForMode = transactions.filter((x) => formModeForTransaction(x) == mode);
  const vendorFrequency = new Map<string, number>();
  transactionsForMode
    .filter((x) => x.hasVendor())
    .map((x) => x.vendor())
    .forEach((x) => vendorFrequency.set(x, (vendorFrequency.get(x) ?? 0) + 1));
  const vendors = [...vendorFrequency.entries()]
    .filter(([_vendor, frequency]) => frequency > 1)
    .sort(([_v1, f1], [_v2, f2]) => f2 - f1)
    .map(([vendor]) => vendor);

  const transactionsWithTrips = transactionsForMode.filter((x) => x.hasTrip());
  const tripIds = [...new Set(transactionsWithTrips.map((x) => x.trip().id()))];
  const tripLastUsageDate = new Map<number, Date>();
  transactionsWithTrips.forEach((x) => {
    const trip = x.trip().id();
    const existing = tripLastUsageDate.get(trip);
    if (!existing || isBefore(existing, x.timestamp)) {
      tripLastUsageDate.set(trip, x.timestamp);
    }
  });
  const tripById = new Map<number, Trip>(trips.map((x) => [x.id(), x]));
  const tripNames = tripIds
    .sort((t1, t2) =>
      isBefore(tripLastUsageDate.get(t1), tripLastUsageDate.get(t2)) ? 1 : -1
    )
    .map((x) => tripById.get(x).name());

  return (
    <>
      <InputRow>
        <MoneyInputWithLabel
          name="amount"
          label="Amount"
          disabled={isSubmitting}
        />
      </InputRow>

      <InputRow
        mode={mode}
        modes={
          props.isAdvancedMode
            ? [FormMode.PERSONAL, FormMode.EXTERNAL, FormMode.INCOME]
            : []
        }
      >
        <MoneyInputWithLabel
          name="ownShareAmount"
          label="Own share amount"
          disabled={isSubmitting}
        />
      </InputRow>

      <InputRow
        mode={mode}
        modes={[FormMode.PERSONAL, FormMode.EXTERNAL, FormMode.INCOME]}
      >
        <Switch.Group>
          <div className="flex items-center">
            <div className="flex">
              <Switch
                checked={isFamilyExpense}
                onChange={() => {
                  setFieldValue("isFamilyExpense", !isFamilyExpense);
                }}
                className={classNames(
                  isFamilyExpense ? "bg-indigo-700" : "bg-gray-200",
                  isSubmitting ? "opacity-30" : "",
                  "relative inline-flex h-6 w-11 items-center rounded-full"
                )}
                disabled={isSubmitting}
              >
                <span
                  className={`${isFamilyExpense ? "translate-x-6" : "translate-x-1"
                    } inline-block h-4 w-4 transform rounded-full bg-white transition`}
                />
              </Switch>
            </div>
            <div className="ml-4 text-sm">
              <Switch.Label className="font-medium text-gray-700">
                Shared transaction
              </Switch.Label>
              <p className="text-gray-500">
                Set the own amount to be 50% of the total.
              </p>
            </div>
          </div>
        </Switch.Group>
      </InputRow>

      <InputRow
        mode={mode}
        modes={props.isAdvancedMode ? [FormMode.TRANSFER] : []}
      >
        <MoneyInputWithLabel
          name="receivedAmount"
          label="Received"
          disabled={isSubmitting}
        />
      </InputRow>

      {/* TODO: verify that datetime-local is processed correctly with regards to timezones */}
      <InputRow mode={mode}>
        <label
          htmlFor="timestamp"
          className="block text-sm font-medium text-gray-700"
        >
          Time
        </label>
        <Input
          type="datetime-local"
          name="timestamp"
          id="timestamp"
          disabled={isSubmitting}
          className="mt-1 block w-full"
          value={timestamp}
          onChange={handleChange}
        />
      </InputRow>

      <InputRow
        mode={mode}
        modes={[FormMode.PERSONAL, FormMode.EXTERNAL, FormMode.INCOME]}
      >
        <TextInputWithLabel
          name="vendor"
          label="Vendor"
          list="vendors"
          disabled={isSubmitting}
        />
        <datalist id="vendors">
          {vendors.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
      </InputRow>

      <InputRow
        mode={mode}
        modes={
          props.isAdvancedMode
            ? [FormMode.PERSONAL, FormMode.EXTERNAL]
            : [FormMode.TRANSFER]
        }
      >
        <TextInputWithLabel
          name="description"
          label="Description"
          disabled={isSubmitting}
        />
      </InputRow>

      <InputRow mode={mode}>
        <SelectNumber
          name="categoryId"
          label="Category"
          disabled={isSubmitting}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nameWithAncestors}
            </option>
          ))}
        </SelectNumber>
      </InputRow>

      <InputRow mode={mode} modes={[FormMode.EXTERNAL]}>
        <TextInputWithLabel
          name="payer"
          label="Payer"
          disabled={isSubmitting}
        />
      </InputRow>

      <InputRow mode={mode} modes={[FormMode.TRANSFER, FormMode.PERSONAL]}>
        <BankAccountSelect
          name="fromBankAccountId"
          label="Account From"
          disabled={isSubmitting}
        />
      </InputRow>

      <InputRow mode={mode} modes={[FormMode.TRANSFER, FormMode.INCOME]}>
        <BankAccountSelect
          name="toBankAccountId"
          label="Account To"
          disabled={isSubmitting}
        />
      </InputRow>

      <InputRow mode={mode} modes={[FormMode.EXTERNAL]}>
        <SelectNumber
          name="currencyId"
          label="Currency"
          disabled={isSubmitting}
        >
          {currencies.all().map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectNumber>
      </InputRow>

      <InputRow
        mode={mode}
        modes={
          props.isAdvancedMode ? [FormMode.PERSONAL, FormMode.EXTERNAL] : []
        }
      >
        <TextInputWithLabel
          name="tripName"
          label="Trip"
          list="trips"
          disabled={isSubmitting}
        />
        <datalist id="trips">
          {tripNames.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
      </InputRow>
    </>
  );
};
