import React, { useState } from "react";
import Bank from "../lib/model/Bank";
import Category from "../lib/model/Category";
import Transaction from "../lib/model/Transaction";
import AddTransactionInput from "../lib/model/AddTransactionInput";
import { Formik, Field, Form, FormikHelpers } from "formik";

type AddTransactionFormProps = {
  banks: Bank[];
  categories: Category[];
  onAdded: (added: Transaction) => void;
};

type AddTransactionFormValues = {
  timestamp: Date;
  description: string;
  amount: number;
  categoryId: number;
};

const formValuesToApiInput = (
  form: AddTransactionFormValues
): AddTransactionInput => {
  const out: AddTransactionInput = Object.assign({}, form, {
    amountCents: Math.round(form.amount * 100),
  });
  return out;
};

export const AddTransactionForm: React.FC<AddTransactionFormProps> = (
  props
) => {
  const [formDisplayed, setFormDisplayed] = useState(false);
  const [apiError, setApiError] = useState("");

  const reset = () => {
    setApiError("");
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
          description: "",
          amount: 0,
          categoryId: props.categories[0].id,
        }}
        onSubmit={async (
          values: AddTransactionFormValues,
          { setSubmitting }: FormikHelpers<AddTransactionFormValues>
        ) => {
          try {
            const body = JSON.stringify(formValuesToApiInput(values));
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
          <Form>
            <label htmlFor="description">Description</label>
            <Field
              id="description"
              name="description"
              placeholder="description"
            />

            <label htmlFor="amount">Amount</label>
            <Field
              id="amount"
              name="amount"
              type="number"
              placeholder="Amount"
            />

            <label htmlFor="categoryId">Category</label>
            <Field id="categoryId" name="categoryId" as="select">
              {props.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameWithAncestors}
                </option>
              ))}
            </Field>

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
