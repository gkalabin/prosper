import React, { useState } from "react";
import Bank from "../../lib/model/Bank";
import Category from "../../lib/model/Category";
import Transaction from "../../lib/model/Transaction";
import Currency from "../../lib/model/Currency";
import {
  AddTransactionFormValues,
  FormMode,
  formToDTO,
} from "../../lib/AddTransactionDataModels";
import { Formik, Form, FormikHelpers } from "formik";
import { BankAccountSelect } from "../forms/BankAccountSelect";
import { Button } from "../forms/Button";
import { CategorySelect } from "../forms/CategorySelect";
import { MoneyInput, TextInput } from "../forms/Input";
import CurrencySelect from "../forms/CurrencySelect";

type AddTransactionFormProps = {
  banks: Bank[];
  categories: Category[];
  currencies: Currency[];
  onAdded: (added: Transaction) => void;
};

const PersonalTransactionForm: React.FC<AddTransactionFormProps> = (props) => {
  return (
    <>
      <TextInput name="timestamp" type="datetime-local" />
      <TextInput name="vendor" />
      <TextInput name="description" />
      <MoneyInput name="amount" />
      <MoneyInput name="ownShareAmount" />
      <BankAccountSelect
        name="fromBankAccountId"
        label="Bank Account"
        banks={props.banks}
      />
      <CategorySelect
        name="categoryId"
        label="Category"
        categories={props.categories}
      />
    </>
  );
};

export const ExternalTransactionForm: React.FC<AddTransactionFormProps> = (
  props
) => {
  return (
    <>
      <TextInput name="timestamp" type="datetime-local" />
      <TextInput name="vendor" />
      <TextInput name="description" />
      <TextInput name="payer" />
      <MoneyInput name="amount" />
      <MoneyInput name="ownShareAmount" />
      <CategorySelect
        name="categoryId"
        label="Category"
        categories={props.categories}
      />
      <CurrencySelect
        name="currencyId"
        label="Currency"
        currencies={props.currencies}
      />
    </>
  );
};

export const NewTransferForm: React.FC<AddTransactionFormProps> = (props) => {
  return (
    <>
      <TextInput name="timestamp" type="datetime-local" />
      <TextInput name="description" />
      <MoneyInput name="amount" />
      <MoneyInput name="receivedAmount" />
      <CategorySelect
        name="categoryId"
        label="Category"
        categories={props.categories}
      />
      <BankAccountSelect
        name="fromBankAccountId"
        label="From Bank Account"
        banks={props.banks}
      />
      <BankAccountSelect
        name="toBankAccountId"
        label="To Bank Account"
        banks={props.banks}
      />
    </>
  );
};

export const IncomeTransactionForm: React.FC<AddTransactionFormProps> = (
  props
) => {
  return (
    <>
      <TextInput name="timestamp" type="datetime-local" />
      <TextInput name="vendor" />
      <TextInput name="description" />
      <MoneyInput name="amount" />
      <MoneyInput name="ownShareAmount" />
      <BankAccountSelect
        name="toBankAccountId"
        label="Bank Account"
        banks={props.banks}
      />
      <CategorySelect
        name="categoryId"
        label="Category"
        categories={props.categories}
      />
    </>
  );
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

  if (!formDisplayed) {
    return <button onClick={open}>New Transaction</button>;
  }
  return (
    <div>
      <Formik
        initialValues={{
          timestamp: new Date(),
          vendor: "",
          description: "",
          amount: 0,
          ownShareAmount: 0,
          receivedAmount: 0,
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
            setApiError(`Failed to add: ${error}`);
          }
          setSubmitting(false);
        }}
      >
        {({ isSubmitting }) => (
          // TODO: disable form when submitting
          <Form className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4 w-96">
            {/* TODO: make button group */}
            <div>
              <Button
                onClick={() => setMode(FormMode.PERSONAL)}
                disabled={isSubmitting}
                label="Personal"
              />
              <Button
                type="button"
                onClick={() => setMode(FormMode.EXTERNAL)}
                disabled={isSubmitting}
                label="External"
              />
              <Button
                type="button"
                onClick={() => setMode(FormMode.TRANSFER)}
                disabled={isSubmitting}
                label="Transfer"
              />
              <Button
                type="button"
                onClick={() => setMode(FormMode.INCOME)}
                disabled={isSubmitting}
                label="Income"
              />
            </div>

            {mode == FormMode.PERSONAL && (
              <PersonalTransactionForm {...props} />
            )}
            {mode == FormMode.EXTERNAL && (
              <ExternalTransactionForm {...props} />
            )}
            {mode == FormMode.TRANSFER && <NewTransferForm {...props} />}
            {mode == FormMode.INCOME && <IncomeTransactionForm {...props} />}

            <button onClick={close} disabled={isSubmitting}>
              Cancel
            </button>

            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding…" : "Add"}
            </button>

            {apiError && <span>{apiError}</span>}
          </Form>
        )}
      </Formik>
    </div>
  );
};
