import { Switch } from "@headlessui/react";
import { Transaction as DBTransaction } from "@prisma/client";
import { BankAccountSelect } from "components/forms/BankAccountSelect";
import {
  MoneyInputWithLabel,
  TextInputWithLabel,
} from "components/forms/Input";
import { SelectNumber } from "components/forms/Select";
import { ButtonFormPrimary, ButtonFormSecondary } from "components/ui/buttons";
import { format } from "date-fns";
import { Formik, FormikHelpers, useFormikContext } from "formik";
import {
  AddTransactionFormValues,
  FormMode,
  formModeForTransaction,
  formToDTO,
} from "lib/AddTransactionDataModels";
import { useCurrencyContext } from "lib/ClientSideModel";
import { Bank, BankAccount } from "lib/model/BankAccount";
import { Category } from "lib/model/Category";
import { Currency } from "lib/model/Currency";
import { Transaction } from "lib/model/Transaction";
import React, { useEffect, useState } from "react";
import { FormTransactionTypeSelector } from "./FormTransactionTypeSelector";

export type AddTransactionFormProps = {
  banks: Bank[];
  categories: Category[];
  transaction?: Transaction;
  allTransactions: Transaction[];
  obData?: any;
  onAdded: (added: DBTransaction) => void;
  onClose: () => void;
};

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

function initialValuesForTransaction(
  t: Transaction,
  defaultAccountFrom: BankAccount,
  defaultAccountTo: BankAccount
): AddTransactionFormValues {
  const defaults: AddTransactionFormValues = {
    // 2022-12-19T18:05:59
    timestamp: toDateTimeLocal(t.timestamp),
    vendor: t.vendor(),
    description: t.description,
    amount: t.amount().dollar(),
    ownShareAmount: t.amount().dollar(),
    receivedAmount: t.amount().dollar(),
    fromBankAccountId: (t.accountFrom() ?? defaultAccountFrom).id,
    toBankAccountId: (t.accountTo() ?? defaultAccountTo).id,
    categoryId: t.category.id,
    currencyId: t.currency().id,
    isFamilyExpense: t.isFamilyExpense(),
  };
  if (t.isTransfer()) {
    defaults.receivedAmount = t.amountReceived().dollar();
  }
  if (t.isPersonalExpense() || t.isThirdPartyExpense() || t.isIncome()) {
    defaults.ownShareAmount = t.amountOwnShare().dollar();
  }
  return defaults;
}

function initialValuesEmpty(
  defaultAccountFrom: BankAccount,
  defaultAccountTo: BankAccount,
  defaultCategory: Category,
  defaultCurrency: Currency
): AddTransactionFormValues {
  const now = new Date();
  return {
    timestamp: toDateTimeLocal(now),
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
  };
}

function mostUsedAccountFrom(mode: FormMode, txs: Transaction[]): BankAccount {
  const accounts = txs
    .filter((x) => {
      if (mode == FormMode.PERSONAL) {
        return x.isPersonalExpense();
      }
      if (mode == FormMode.TRANSFER) {
        return x.isTransfer();
      }
      return true;
    })
    .map((x) => x.accountFrom())
    .filter((x) => !!x);
  return mostFrequent(accounts);
}

function mostUsedCategory(
  mode: FormMode,
  txs: Transaction[],
  vendor: string
): Category {
  const categories = txs
    .filter((x) => {
      switch (mode) {
        case FormMode.PERSONAL:
          return x.isPersonalExpense();
        case FormMode.INCOME:
          return x.isIncome();
        case FormMode.EXTERNAL:
          return x.isThirdPartyExpense();
        default:
          return false;
      }
    })
    .filter((x) => vendor == "" || x.vendor() == vendor)
    .map((x) => x.category)
    .filter((x) => !!x);
  return mostFrequent(categories);
}

function mostUsedAccountTo(mode: FormMode, txs: Transaction[]): BankAccount {
  const accounts = txs
    .filter((x) => {
      if (mode == FormMode.INCOME) {
        return x.isIncome();
      }
      if (mode == FormMode.TRANSFER) {
        return x.isTransfer();
      }
      return true;
    })
    .map((x) => x.accountTo())
    .filter((x) => !!x);
  return mostFrequent(accounts);
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

const NewTransactionSuggestions = ({
  obData,
  banks,
}: {
  banks: Bank[];
  obData: any;
}) => {
  console.log(obData);
  const accountsWithData = banks
    .flatMap((x) => x.accounts)
    .filter((x) => !!obData.transactions[x.id]);
  const obTransactions = Object.fromEntries(
    Object.entries(obData.transactions).map(([accountId, transactions]) => {
      const pending = transactions.pending.map((t) =>
        Object.assign({}, t, {
          pending: true,
        })
      );
      const settled = transactions.settled.map((t) =>
        Object.assign({}, t, {
          pending: false,
        })
      );
      const merged = [...pending, ...settled]
        .map((t) =>
          Object.assign(t, {
            timestamp: new Date(t.timestamp),
          })
        )
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      return [accountId, merged];
    })
  );
  return (
    <>
      {accountsWithData.map((account) => (
        <h1 key={account.id}>
          {account.bank.name}: {account.name}
          {obTransactions[account.id].slice(0, 10).map((obTransaction) => (
            <li key={obTransaction.id}>
              {obTransaction.timestamp.toISOString()}: {obTransaction.description}
            </li>
          ))}
        </h1>
      ))}
    </>
  );
};

export const AddTransactionForm = (props: AddTransactionFormProps) => {
  const [apiError, setApiError] = useState("");
  const [mode, setMode] = useState(formModeForTransaction(props.transaction));
  const [isAdvancedMode, setAdvancedMode] = useState(false);
  const currencies = useCurrencyContext();

  const submitNewTransaction = async (
    values: AddTransactionFormValues,
    { setSubmitting }: FormikHelpers<AddTransactionFormValues>
  ) => {
    try {
      const body = JSON.stringify(formToDTO(mode, values, props.transaction));
      const added = await fetch("/api/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body,
      });
      setSubmitting(false);
      props.onAdded(await added.json());
    } catch (error) {
      setSubmitting(false);
      console.log(error);
      setApiError(`Failed to add: ${error}`);
    }
  };

  const creatingNewTransaction = !props.transaction;
  const defaultAccountFrom = mostUsedAccountFrom(mode, props.allTransactions);
  const defaultAccountTo = mostUsedAccountTo(mode, props.allTransactions);
  const defaultCategory = props.categories[0];
  const defaultCurrency = currencies.all()[0];
  const initialValues = !props.transaction
    ? initialValuesEmpty(
        defaultAccountFrom,
        defaultAccountTo,
        defaultCategory,
        defaultCurrency
      )
    : initialValuesForTransaction(
        props.transaction,
        defaultAccountFrom,
        defaultAccountTo
      );

  return (
    <div>
      <Formik initialValues={initialValues} onSubmit={submitNewTransaction}>
        {({ isSubmitting }) => (
          <div className="overflow-hidden shadow sm:rounded-md">
            <div className="bg-white p-2 sm:p-6">
              <NewTransactionSuggestions
                obData={props.obData}
                banks={props.banks}
              />

              <FormTransactionTypeSelector
                disabled={isSubmitting}
                mode={mode}
                setMode={(m) => setMode(m)}
              >
                <FormInputs
                  transaction={props.transaction}
                  allTransactions={props.allTransactions}
                  categories={props.categories}
                  isAdvancedMode={isAdvancedMode}
                  banks={props.banks}
                  mode={mode}
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
                label="Advanced"
              />

              <ButtonFormSecondary
                className="self-start"
                onClick={props.onClose}
                disabled={isSubmitting}
                label="Cancel"
              />

              <ButtonFormPrimary
                className="self-start"
                disabled={isSubmitting}
                label={
                  creatingNewTransaction
                    ? isSubmitting
                      ? "Adding…"
                      : "Add"
                    : isSubmitting
                    ? "Updating…"
                    : "Update"
                }
              />
            </div>
          </div>
        )}
      </Formik>
    </div>
  );
};

const FormInputs = (props: {
  transaction: Transaction;
  allTransactions: Transaction[];
  categories: Category[];
  isAdvancedMode: boolean;
  banks: Bank[];
  mode: FormMode;
}) => {
  const currencies = useCurrencyContext();
  const {
    values: { amount, vendor, timestamp, isFamilyExpense },
    touched,
    setFieldValue,
    handleChange,
    dirty,
  } = useFormikContext<AddTransactionFormValues>();

  useEffect(() => {
    setFieldValue("ownShareAmount", isFamilyExpense ? amount / 2 : amount);
  }, [amount, dirty, isFamilyExpense, setFieldValue]);

  useEffect(() => {
    setFieldValue("receivedAmount", amount);
  }, [amount, dirty, setFieldValue]);

  useEffect(() => {
    if (!props.transaction && !touched["fromBankAccountId"]) {
      setFieldValue(
        "fromBankAccountId",
        mostUsedAccountFrom(props.mode, props.allTransactions).id
      );
    }
    if (!props.transaction && !touched["toBankAccountId"]) {
      setFieldValue(
        "toBankAccountId",
        mostUsedAccountTo(props.mode, props.allTransactions).id
      );
    }
  }, [
    props.allTransactions,
    props.mode,
    props.transaction,
    setFieldValue,
    touched,
  ]);

  useEffect(() => {
    const suggestion = mostUsedCategory(
      props.mode,
      props.allTransactions,
      vendor
    );
    if (suggestion) {
      setFieldValue("categoryId", suggestion.id);
    }
  }, [
    dirty,
    props.allTransactions,
    props.mode,
    setFieldValue,
    touched,
    vendor,
  ]);

  const vendorFrequency: { [vendor: string]: number } = {};
  props.allTransactions
    .filter((x) => {
      switch (props.mode) {
        case FormMode.PERSONAL:
          return x.isPersonalExpense();
        case FormMode.INCOME:
          return x.isIncome();
        case FormMode.EXTERNAL:
          return x.isThirdPartyExpense();
        default:
          return false;
      }
    })
    .map((x) => x.vendor())
    .forEach((x) => (vendorFrequency[x] = (vendorFrequency[x] ?? 0) + 1));
  const vendors = Object.entries(vendorFrequency)
    .filter((x) => x[1] > 1)
    .sort((a, b) => b[1] - a[1])
    .map((x) => x[0]);

  return (
    <>
      <InputRow>
        <MoneyInputWithLabel name="amount" label="Amount" />
      </InputRow>

      <InputRow
        mode={props.mode}
        modes={
          props.isAdvancedMode
            ? [FormMode.PERSONAL, FormMode.EXTERNAL, FormMode.INCOME]
            : []
        }
      >
        <MoneyInputWithLabel name="ownShareAmount" label="Own share amount" />
      </InputRow>

      <InputRow
        mode={props.mode}
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
                className={`${
                  isFamilyExpense ? "bg-indigo-700" : "bg-gray-200"
                } relative inline-flex h-6 w-11 items-center rounded-full`}
              >
                <span
                  className={`${
                    isFamilyExpense ? "translate-x-6" : "translate-x-1"
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
        mode={props.mode}
        modes={props.isAdvancedMode ? [FormMode.TRANSFER] : []}
      >
        <MoneyInputWithLabel name="receivedAmount" label="Received" />
      </InputRow>

      {/* TODO: verify that datetime-local is processed correctly with regards to timezones */}
      <InputRow mode={props.mode}>
        <label
          htmlFor="timestamp"
          className="block text-sm font-medium text-gray-700"
        >
          Time
        </label>
        <input
          type="datetime-local"
          name="timestamp"
          id="timestamp"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          value={timestamp}
          onChange={handleChange}
        />
      </InputRow>

      <InputRow
        mode={props.mode}
        modes={[FormMode.PERSONAL, FormMode.EXTERNAL, FormMode.INCOME]}
      >
        <TextInputWithLabel name="vendor" label="Vendor" list="vendors" />
        <datalist id="vendors">
          {vendors.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
      </InputRow>

      <InputRow
        mode={props.mode}
        modes={
          props.isAdvancedMode
            ? [FormMode.PERSONAL, FormMode.EXTERNAL]
            : [FormMode.TRANSFER]
        }
      >
        <TextInputWithLabel name="description" label="Description" />
      </InputRow>

      <InputRow mode={props.mode}>
        <SelectNumber name="categoryId" label="Category">
          {props.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nameWithAncestors}
            </option>
          ))}
        </SelectNumber>
      </InputRow>

      <InputRow mode={props.mode} modes={[FormMode.EXTERNAL]}>
        <TextInputWithLabel name="payer" label="Payer" />
      </InputRow>

      <InputRow
        mode={props.mode}
        modes={[FormMode.TRANSFER, FormMode.PERSONAL]}
      >
        <BankAccountSelect
          name="fromBankAccountId"
          label="Account From"
          banks={props.banks}
        />
      </InputRow>

      <InputRow mode={props.mode} modes={[FormMode.TRANSFER, FormMode.INCOME]}>
        <BankAccountSelect
          name="toBankAccountId"
          label="Account To"
          banks={props.banks}
        />
      </InputRow>

      <InputRow mode={props.mode} modes={[FormMode.EXTERNAL]}>
        <SelectNumber name="currencyId" label="Currency">
          {currencies.all().map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectNumber>
      </InputRow>
    </>
  );
};
