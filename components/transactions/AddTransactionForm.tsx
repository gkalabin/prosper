import classNames from "classnames";
import { Form, Formik, FormikHelpers } from "formik";
import Link from "next/link";
import React, { useState } from "react";
import {
  AddTransactionFormValues,
  FormMode,
  formToDTO,
} from "../../lib/AddTransactionDataModels";
import { Bank } from "../../lib/model/BankAccount";
import Category from "../../lib/model/Category";
import Currency from "../../lib/model/Currency";
import Transaction from "../../lib/model/Transaction";
import { BankAccountSelect } from "../forms/BankAccountSelect";
import { CategorySelect } from "../forms/CategorySelect";
import CurrencySelect from "../forms/CurrencySelect";
import { MoneyInput, TextInput } from "../forms/Input";

type AddTransactionFormProps = {
  banks: Bank[];
  categories: Category[];
  currencies: Currency[];
  onAdded: (added: Transaction) => void;
};

export const AddTransactionForm: React.FC<AddTransactionFormProps> = (
  props
) => {
  const [formDisplayed, setFormDisplayed] = useState(false);
  const [apiError, setApiError] = useState("");
  // TODO: use enum
  const [mode, setMode] = useState(FormMode.PERSONAL);

  const reset = () => {
    setApiError("");
    // TODO: reset form
  };

  const open = () => {
    reset();
    setFormDisplayed(true);
  };

  const close = () => {
    reset();
    setFormDisplayed(false);
  };

  if (!props.categories?.length || !props.banks?.length) {
    return (
      <div>
        To create transactions, you need to have at least one:
        {!props.categories?.length && (
          <li>
            <Link href="/config/categories">category</Link>
          </li>
        )}
        {!props.banks?.length && (
          <li>
            <Link href="/config/banks">bank</Link>
          </li>
        )}
      </div>
    );
  }
  if (!formDisplayed) {
    return (
      <div className="flex justify-end">
        <button
          className="mb-4 rounded-md bg-indigo-600 px-4 py-1.5 text-base font-medium leading-7 text-white shadow-sm hover:bg-indigo-700 hover:ring-indigo-700"
          onClick={open}
        >
          New Transaction
        </button>
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

  // TODO: verify that datetime-local is processed correctly with regards to timezones
  const now = new Date();
  const dateTimeLocalNow = new Date(
    now.getTime() - now.getTimezoneOffset() * 60000
  )
    .toISOString()
    .slice(0, -1);

  return (
    <div>
      <Formik
        initialValues={{
          timestamp: dateTimeLocalNow,
          vendor: "",
          description: "",
          amount: 0,
          ownShareAmount: 0,
          receivedAmount: 0,
          // TODO: fix, use bank account
          fromBankAccountId: props.banks[0].id,
          toBankAccountId: props.banks[0].id,
          categoryId: props.categories[0].id,
          currencyId: props.currencies[0].id,
        }}
        onSubmit={async (
          values: AddTransactionFormValues,
          { setSubmitting }: FormikHelpers<AddTransactionFormValues>
        ) => {
          try {
            const body = JSON.stringify(formToDTO(mode, values));
            const added = await fetch("/api/transaction", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: body,
            });
            close();
            props.onAdded(await added.json());
          } catch (error) {
            console.log(error);
            setApiError(`Failed to add: ${error}`);
          }
          setSubmitting(false);
        }}
      >
        {({ values, handleChange, isSubmitting }) => (
          // TODO: disable form when submitting
          <Form className="mb-4 w-9/12 rounded bg-white px-8 pt-6 pb-8 shadow-md">
            <div className="overflow-hidden shadow sm:rounded-md">
              <div className="bg-white px-4 py-5 sm:p-6">
                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6 mb-4 flex justify-center">
                    <div className="rounded-md shadow-sm">
                      <button
                        type="button"
                        className={classNames(
                          "rounded-l-lg border border-gray-200 bg-white py-2 px-4 text-sm font-medium hover:bg-gray-100 hover:text-indigo-700 focus:z-10 focus:text-indigo-700 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 dark:hover:text-white dark:focus:text-white",
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
                          "border-t border-b border-r border-gray-200 bg-white py-2 px-4 text-sm font-medium hover:bg-gray-100 hover:text-indigo-700 focus:z-10 focus:text-indigo-700 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 dark:hover:text-white dark:focus:text-white",
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
                          "border-t border-b border-r border-gray-200 bg-white py-2 px-4 text-sm font-medium hover:bg-gray-100 hover:text-indigo-700 focus:z-10 focus:text-indigo-700 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 dark:hover:text-white dark:focus:text-white",
                          modeSelectorTextColor(FormMode.TRANSFER)
                        )}
                        onClick={() => setMode(FormMode.TRANSFER)}
                        disabled={isSubmitting}
                      >
                        Transfer
                      </button>
                      <button
                        className={classNames(
                          "rounded-r-md border border-gray-200 bg-white py-2 px-4 text-sm font-medium hover:bg-gray-100 hover:text-indigo-700 focus:z-10 focus:text-indigo-700 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 dark:hover:text-white dark:focus:text-white",
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
                  <div className="col-span-6 sm:col-span-3">
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

                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="vendor"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Vendor
                    </label>
                    <input
                      type="text"
                      name="vendor"
                      id="vendor"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={values.vendor}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="description"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Description
                    </label>
                    <input
                      type="text"
                      name="description"
                      id="description"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={values.description}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="payer"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Payer
                    </label>
                    <input
                      type="text"
                      name="payer"
                      id="payer"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={values.payer}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="amount"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      name="amount"
                      id="amount"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={values.amount}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="ownShareAmount"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Own share amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      name="ownShareAmount"
                      id="ownShareAmount"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={values.ownShareAmount}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="receivedAmount"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Received
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      name="receivedAmount"
                      id="receivedAmount"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={values.receivedAmount}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="fromBankAccountId"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Account From
                    </label>
                    <select
                      id="fromBankAccountId"
                      name="fromBankAccountId"
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                      value={values.fromBankAccountId}
                      onChange={handleChange}
                    >
                      {props.banks.map((b) =>
                        b.accounts.map((ba) => (
                          <option key={ba.id} value={ba.id}>
                            {b.name} {ba.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="toBankAccountId"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Account To
                    </label>
                    <select
                      id="toBankAccountId"
                      name="toBankAccountId"
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                      value={values.toBankAccountId}
                      onChange={handleChange}
                    >
                      {props.banks.map((b) =>
                        b.accounts.map((ba) => (
                          <option key={ba.id} value={ba.id}>
                            {b.name} {ba.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="categoryId"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Category
                    </label>
                    <select
                      id="categoryId"
                      name="categoryId"
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                      value={values.categoryId}
                      onChange={handleChange}
                    >
                      {props.categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nameWithAncestors}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="currencyId"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Currency
                    </label>
                    <select
                      id="currencyId"
                      name="currencyId"
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                      value={values.currencyId}
                      onChange={handleChange}
                    >
                      {props.currencies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 text-right sm:px-6">
                <button
                  type="button"
                  className="mr-2 inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  onClick={close}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  {isSubmitting ? "Adding…" : "Add"}
                </button>
              </div>
            </div>

            {apiError && <span>{apiError}</span>}
          </Form>
        )}
      </Formik>
    </div>
  );
};
