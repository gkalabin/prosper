import { Switch } from "@headlessui/react";
import { Transaction as DBTransaction } from "@prisma/client";
import classNames from "classnames";
import { BankAccountSelect } from "components/forms/BankAccountSelect";
import { MoneyInput, TextInput } from "components/forms/Input";
import { SelectNumber } from "components/forms/Select";
import { Form, Formik, FormikHelpers, useFormikContext } from "formik";
import {
  AddTransactionFormValues,
  FormMode,
  formModeForTransaction,
  formToDTO,
} from "lib/AddTransactionDataModels";
import { Bank, bankAccountsFlatList } from "lib/model/BankAccount";
import { Category } from "lib/model/Category";
import { Currency } from "lib/model/Currency";
import { Transaction } from "lib/model/Transaction";
import { toDateTimeLocal } from "lib/TimeHelpers";
import Link from "next/link";
import React, { useEffect, useState } from "react";

type AddTransactionFormProps = {
  banks: Bank[];
  categories: Category[];
  currencies: Currency[];
  transaction?: Transaction;
  onAdded: (added: DBTransaction) => void;
  onClose: () => void;
};

const MyShareAmount = (props: {
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
  return <MoneyInput name={props.name} label="Own share amount" />;
};

const ReceivedAmount = (props: { name: string }) => {
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
  return <MoneyInput name={props.name} label="Received" />;
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
  const bankAccountsList = bankAccountsFlatList(props.banks);

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

  const modeSelectorTextColor = (targetMode: FormMode) => {
    const className = {
      "text-indigo-700": mode == targetMode,
      "text-gray-900": mode != targetMode,
    };
    return className;
  };

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
    amount: props.transaction?.amount() ?? 0,
    ownShareAmount:
      props.transaction?.amountOwnShare() ?? props.transaction?.amount() ?? 0,
    receivedAmount:
      props.transaction?.amountReceived() ?? props.transaction?.amount() ?? 0,
    fromBankAccountId: (props.transaction?.accountFrom() ?? bankAccountsList[0])
      .id,
    toBankAccountId: (props.transaction?.accountTo() ?? bankAccountsList[0]).id,
    categoryId: (props.transaction?.category ?? props.categories[0]).id,
    currencyId: (props.transaction?.isThirdPartyExpense()
      ? props.transaction?.currency()
      : props.currencies[0]
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
                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6 mb-4 flex justify-center">
                    <div className="rounded-md shadow-sm">
                      <button
                        type="button"
                        className={classNames(
                          "rounded-l-lg border border-gray-200 bg-white py-1 px-2 text-sm font-medium hover:bg-gray-100 hover:text-indigo-700 focus:z-10 focus:text-indigo-700 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 dark:hover:text-white dark:focus:text-white",
                          modeSelectorTextColor(FormMode.PERSONAL)
                        )}
                        onClick={() => setMode(FormMode.PERSONAL)}
                        disabled={isSubmitting}
                      >
                        Personal
                      </button>
                      <button
                        type="button"
                        className={classNames(
                          "border-t border-b border-r border-gray-200 bg-white py-1 px-2 text-sm font-medium hover:bg-gray-100 hover:text-indigo-700 focus:z-10 focus:text-indigo-700 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 dark:hover:text-white dark:focus:text-white",
                          modeSelectorTextColor(FormMode.EXTERNAL)
                        )}
                        onClick={() => setMode(FormMode.EXTERNAL)}
                        disabled={isSubmitting}
                      >
                        External
                      </button>
                      <button
                        type="button"
                        className={classNames(
                          "border-t border-b border-r border-gray-200 bg-white py-1 px-2 text-sm font-medium hover:bg-gray-100 hover:text-indigo-700 focus:z-10 focus:text-indigo-700 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 dark:hover:text-white dark:focus:text-white",
                          modeSelectorTextColor(FormMode.TRANSFER)
                        )}
                        onClick={() => setMode(FormMode.TRANSFER)}
                        disabled={isSubmitting}
                      >
                        Transfer
                      </button>
                      <button
                        className={classNames(
                          "rounded-r-md border border-gray-200 bg-white py-1 px-2 text-sm font-medium hover:bg-gray-100 hover:text-indigo-700 focus:z-10 focus:text-indigo-700 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 dark:hover:text-white dark:focus:text-white",
                          modeSelectorTextColor(FormMode.INCOME)
                        )}
                        type="button"
                        onClick={() => setMode(FormMode.INCOME)}
                        disabled={isSubmitting}
                      >
                        Income
                      </button>
                    </div>
                  </div>

                  {/* Inputs */}
                  <div className="col-span-6">
                    <MoneyInput name="amount" label="Amount" />
                  </div>

                  {[
                    FormMode.PERSONAL,
                    FormMode.EXTERNAL,
                    FormMode.INCOME,
                  ].includes(mode) && (
                    <>
                      <div className="col-span-6">
                        <MyShareAmount
                          name="ownShareAmount"
                          isFamilyExpense={isFamilyExpense}
                          isFamilyExpenseDirty={isFamilyExpenseDirty}
                        />
                      </div>

                      <div className="col-span-6">
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
                                  isFamilyExpense
                                    ? "bg-indigo-700"
                                    : "bg-gray-200"
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
                      </div>
                    </>
                  )}

                  {[FormMode.TRANSFER].includes(mode) && (
                    <div className="col-span-6">
                      <ReceivedAmount name="receivedAmount" />
                    </div>
                  )}

                  {/* TODO: verify that datetime-local is processed correctly with regards to timezones */}
                  <div className="col-span-6">
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
                  </div>

                  {[
                    FormMode.PERSONAL,
                    FormMode.EXTERNAL,
                    FormMode.INCOME,
                  ].includes(mode) && (
                    // To make 2 columns: <div className="col-span-6 sm:col-span-3">
                    <div className="col-span-6">
                      <TextInput name="vendor" label="Vendor" />
                    </div>
                  )}

                  <div className="col-span-6">
                    <TextInput name="description" label="Description" />
                  </div>

                  <div className="col-span-6">
                    <SelectNumber name="categoryId" label="Category">
                      {props.categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nameWithAncestors}
                        </option>
                      ))}
                    </SelectNumber>
                  </div>

                  {[FormMode.EXTERNAL].includes(mode) && (
                    <div className="col-span-6">
                      <TextInput name="payer" label="Payer" />
                    </div>
                  )}

                  {[FormMode.PERSONAL, FormMode.TRANSFER].includes(mode) && (
                    <div className="col-span-6">
                      <BankAccountSelect
                        name="fromBankAccountId"
                        label="Account From"
                        banks={props.banks}
                      />
                    </div>
                  )}

                  {[FormMode.TRANSFER, FormMode.INCOME].includes(mode) && (
                    <div className="col-span-6">
                      <BankAccountSelect
                        name="toBankAccountId"
                        label="Account To"
                        banks={props.banks}
                      />
                    </div>
                  )}

                  {[FormMode.EXTERNAL].includes(mode) && (
                    <div className="col-span-6">
                      <SelectNumber name="currencyId" label="Currency">
                        {props.currencies.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </SelectNumber>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex bg-gray-50 px-4 py-3 text-right sm:px-6">
                {apiError && (
                  <div className="grow text-left text-red-700">{apiError}</div>
                )}

                <button
                  type="button"
                  className="mr-2 inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  onClick={props.onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  {creatingNewTransaction
                    ? isSubmitting
                      ? "Adding…"
                      : "Add"
                    : isSubmitting
                    ? "Updating…"
                    : "Update"}
                </button>
              </div>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};
