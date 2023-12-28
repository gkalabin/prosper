import { Switch } from "@headlessui/react";
import { Transaction as DBTransaction } from "@prisma/client";
import { BankAccountSelect } from "components/forms/BankAccountSelect";
import {
  MoneyInputWithLabel,
  TextInputWithLabel,
} from "components/forms/Input";
import { SelectNumber } from "components/forms/Select";
import { ButtonFormPrimary, ButtonFormSecondary } from "components/ui/buttons";
import { Form, Formik, FormikHelpers, useFormikContext } from "formik";
import {
  AddTransactionFormValues,
  FormMode,
  formModeForTransaction,
  formToDTO,
} from "lib/AddTransactionDataModels";
import { useCurrencyContext } from "lib/ClientSideModel";
import { Bank } from "lib/model/BankAccount";
import { Category } from "lib/model/Category";
import { Transaction } from "lib/model/Transaction";
import { toDateTimeLocal } from "lib/TimeHelpers";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { FormTransactionTypeSelector } from "./FormTransactionTypeSelector";

export type AddTransactionFormProps = {
  banks: Bank[];
  categories: Category[];
  transaction?: Transaction;
  onAdded: (added: DBTransaction) => void;
  onClose: () => void;
};

export const MyShareAmount = (props: {
  name: string;
  isFamilyExpense: boolean;
  isFamilyExpenseDirty: boolean;
}) => {
  const {
    values: { amount },
    setFieldValue,
    dirty,
  } = useFormikContext<AddTransactionFormValues>();

  useEffect(() => {
    if (!dirty && !props.isFamilyExpenseDirty) {
      return;
    }
    setFieldValue(props.name, props.isFamilyExpense ? amount / 2 : amount);
  }, [
    props.name,
    amount,
    dirty,
    props.isFamilyExpenseDirty,
    props.isFamilyExpense,
    setFieldValue,
  ]);
  return <MoneyInputWithLabel name={props.name} label="Own share amount" />;
};

export const ReceivedAmount = (props: { name: string }) => {
  const {
    values: { amount },
    setFieldValue,
    dirty,
  } = useFormikContext<AddTransactionFormValues>();

  useEffect(() => {
    if (!dirty) {
      return;
    }
    setFieldValue(props.name, amount);
  }, [props.name, amount, dirty, setFieldValue]);
  return <MoneyInputWithLabel name={props.name} label="Received" />;
};

export const InputRow = (props: {
  currentMode: FormMode;
  currentlyAdvanced: boolean;
  advancedModes?: FormMode[];
  allModes?: FormMode[];
  children: JSX.Element | JSX.Element[];
}) => {
  const field = (
    // To make 2 columns: <div className="col-span-6 sm:col-span-3">
    <div className="col-span-6">{props.children}</div>
  );
  if (!props.advancedModes && !props.allModes) {
    return field;
  }

  return (
    <>
      {((props.advancedModes?.includes(props.currentMode) &&
        props.currentlyAdvanced) ||
        props.allModes?.includes(props.currentMode)) &&
        field}
    </>
  );
};

export const AddTransactionForm: React.FC<AddTransactionFormProps> = (
  props
) => {
  const [apiError, setApiError] = useState("");
  const [mode, setMode] = useState(formModeForTransaction(props.transaction));
  const [isFamilyExpense, setFamilyExpense] = useState(
    props.transaction?.isFamilyExpense() ?? false
  );
  const [isFamilyExpenseDirty, setFamilyExpenseDirty] = useState(false);
  const [isAdvancedMode, setAdvancedMode] = useState(false);
  const bankAccountsList = props.banks.flatMap((b) => b.accounts);
  const currencies = useCurrencyContext();

  if (!props.categories?.length || !bankAccountsList.length) {
    return (
      <div>
        To create transactions, you need to have at least one:
        <ul>
          {!props.categories?.length && (
            <li>
              <Link href="/config/categories">category</Link>
            </li>
          )}
          {!bankAccountsList.length && (
            <li>
              <Link href="/config/banks">bank with a bank account</Link>
            </li>
          )}
        </ul>
      </div>
    );
  }

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
  const now = new Date();
  const initialValues = {
    timestamp: toDateTimeLocal(props.transaction?.timestamp ?? now),
    vendor: props.transaction?.vendor() ?? "",
    description: props.transaction?.description ?? "",
    amount: props.transaction?.amountDeprecated() ?? 0,
    ownShareAmount:
      props.transaction?.amountOwnShare() ?? props.transaction?.amountDeprecated() ?? 0,
    receivedAmount:
      props.transaction?.amountReceivedDeprecated() ?? props.transaction?.amountDeprecated() ?? 0,
    fromBankAccountId: (props.transaction?.accountFrom() ?? bankAccountsList[0])
      .id,
    toBankAccountId: (props.transaction?.accountTo() ?? bankAccountsList[0]).id,
    categoryId: (props.transaction?.category ?? props.categories[0]).id,
    currencyId: (props.transaction?.isThirdPartyExpense()
      ? props.transaction?.currency()
      : currencies.all()[0]
    ).id,
  };

  return (
    <div>
      <Formik initialValues={initialValues} onSubmit={submitNewTransaction}>
        {({ values, handleChange, isSubmitting }) => (
          // TODO: disable form when submitting
          <Form>
            <div className="mb-4 overflow-hidden shadow sm:rounded-md">
              <div className="bg-white px-2 py-5 sm:p-6">
                <FormTransactionTypeSelector
                  transaction={props.transaction}
                  disabled={isSubmitting}
                  mode={mode}
                  setMode={(newMode) => setMode(newMode)}
                >
                  {/* Inputs */}
                  <InputRow
                    currentMode={mode}
                    currentlyAdvanced={isAdvancedMode}
                  >
                    <MoneyInputWithLabel name="amount" label="Amount" />
                  </InputRow>

                  <InputRow
                    currentMode={mode}
                    currentlyAdvanced={isAdvancedMode}
                    advancedModes={[
                      FormMode.PERSONAL,
                      FormMode.EXTERNAL,
                      FormMode.INCOME,
                    ]}
                  >
                    <MyShareAmount
                      name="ownShareAmount"
                      isFamilyExpense={isFamilyExpense}
                      isFamilyExpenseDirty={isFamilyExpenseDirty}
                    />
                  </InputRow>

                  <InputRow
                    currentMode={mode}
                    currentlyAdvanced={isAdvancedMode}
                  >
                    <Switch.Group>
                      <div className="flex items-center">
                        <div className="flex">
                          <Switch
                            checked={isFamilyExpense}
                            onChange={() => {
                              setFamilyExpense(!isFamilyExpense);
                              setFamilyExpenseDirty(true);
                            }}
                            className={`${
                              isFamilyExpense ? "bg-indigo-700" : "bg-gray-200"
                            } relative inline-flex h-6 w-11 items-center rounded-full`}
                          >
                            <span
                              className={`${
                                isFamilyExpense
                                  ? "translate-x-6"
                                  : "translate-x-1"
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
                    currentMode={mode}
                    currentlyAdvanced={isAdvancedMode}
                    advancedModes={[FormMode.TRANSFER]}
                  >
                    <ReceivedAmount name="receivedAmount" />
                  </InputRow>

                  {/* TODO: verify that datetime-local is processed correctly with regards to timezones */}
                  <InputRow
                    currentMode={mode}
                    currentlyAdvanced={isAdvancedMode}
                  >
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
                      value={values.timestamp}
                      onChange={handleChange}
                    />
                  </InputRow>

                  <InputRow
                    currentMode={mode}
                    currentlyAdvanced={isAdvancedMode}
                    allModes={[
                      FormMode.PERSONAL,
                      FormMode.EXTERNAL,
                      FormMode.INCOME,
                    ]}
                  >
                    <TextInputWithLabel name="vendor" label="Vendor" />
                  </InputRow>

                  <InputRow
                    currentMode={mode}
                    currentlyAdvanced={isAdvancedMode}
                    advancedModes={[FormMode.PERSONAL, FormMode.EXTERNAL]}
                    allModes={[FormMode.TRANSFER]}
                  >
                    <TextInputWithLabel
                      name="description"
                      label="Description"
                    />
                  </InputRow>

                  <InputRow
                    currentMode={mode}
                    currentlyAdvanced={isAdvancedMode}
                  >
                    <SelectNumber name="categoryId" label="Category">
                      {props.categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nameWithAncestors}
                        </option>
                      ))}
                    </SelectNumber>
                  </InputRow>

                  <InputRow
                    currentMode={mode}
                    currentlyAdvanced={isAdvancedMode}
                    allModes={[FormMode.EXTERNAL]}
                  >
                    <TextInputWithLabel name="payer" label="Payer" />
                  </InputRow>

                  <InputRow
                    currentMode={mode}
                    currentlyAdvanced={isAdvancedMode}
                    allModes={[FormMode.TRANSFER, FormMode.PERSONAL]}
                  >
                    <BankAccountSelect
                      name="fromBankAccountId"
                      label="Account From"
                      banks={props.banks}
                    />
                  </InputRow>

                  <InputRow
                    currentMode={mode}
                    currentlyAdvanced={isAdvancedMode}
                    allModes={[FormMode.TRANSFER, FormMode.INCOME]}
                  >
                    <BankAccountSelect
                      name="toBankAccountId"
                      label="Account To"
                      banks={props.banks}
                    />
                  </InputRow>

                  <InputRow
                    currentMode={mode}
                    currentlyAdvanced={isAdvancedMode}
                    allModes={[FormMode.EXTERNAL]}
                  >
                    <SelectNumber name="currencyId" label="Currency">
                      {currencies.all().map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </SelectNumber>
                  </InputRow>
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
          </Form>
        )}
      </Formik>
    </div>
  );
};
