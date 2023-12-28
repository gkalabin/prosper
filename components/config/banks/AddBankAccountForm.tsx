import { BankAccount as DBBankAccount } from "@prisma/client";
import { FormikInput, FormikMoneyInput } from "components/forms/Input";
import { SelectNumber } from "components/forms/Select";
import {
  ButtonFormPrimary,
  ButtonFormSecondary,
  ButtonLink,
} from "components/ui/buttons";
import { Form, Formik } from "formik";
import { Bank } from "lib/model/BankAccount";
import { Currencies } from "lib/model/Currency";
import Link from "next/link";
import { useState } from "react";

export const AddBankAccountForm = (props: {
  displayOrder: number;
  bank: Bank;
  currencies: Currencies;
  onAddedOrUpdated: (x: DBBankAccount) => void;
}) => {
  const [formDisplayed, setFormDisplayed] = useState(false);
  const [apiError, setApiError] = useState("");
  const initialValues = {
    name: "",
    currencyId: props.currencies.all()[0]?.id,
    isJoint: false,
    initialBalance: 0,
  };

  const handleSubmit = async ({ name, currencyId, isJoint, initialBalance }) => {
    setApiError("");
    try {
      const body = {
        name,
        currencyId,
        isJoint,
        initialBalance,
        displayOrder: props.displayOrder,
        bankId: props.bank.id,
      };
      const added = await fetch("/api/config/bank-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      props.onAddedOrUpdated(await added.json());
      setFormDisplayed(false);
    } catch (error) {
      setApiError(`Failed to add: ${error}`);
    }
  };

  if (!props.currencies.all().length) {
    return (
      <>
        To add a bank account, first{" "}
        <Link href="/config/currencies">
          <a>add a currency.</a>
        </Link>
      </>
    );
  }
  if (!formDisplayed) {
    return (
      <ButtonLink onClick={() => setFormDisplayed(true)}>
        Add Bank Account
      </ButtonLink>
    );
  }
  return (
    <Formik initialValues={initialValues} onSubmit={handleSubmit}>
      {({ isSubmitting, values }) => (
        <Form className="flex max-w-xs flex-col gap-2 px-4 pb-6 pt-2">
          <h3 className="mb-2 text-xl font-medium leading-5">
            Add New Bank Account
          </h3>
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Account Name
            </label>
            <FormikInput
              autoFocus
              name="name"
              disabled={isSubmitting}
              className="w-full"
            />
          </div>
          <div>
            <label
              htmlFor="currencyId"
              className="block text-sm font-medium text-gray-700"
            >
              Account currency
            </label>
            <SelectNumber
              name="currencyId"
              disabled={isSubmitting}
              className="w-full"
            >
              {props.currencies.all().map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </SelectNumber>
          </div>
          <div>
            <label
              htmlFor="initialBalance"
              className="block text-sm font-medium text-gray-700"
            >
              Initial balance
            </label>
            <FormikMoneyInput
              name="initialBalance"
              disabled={isSubmitting}
              className="w-full"
            />
          </div>
          <div className="flex flex-row gap-3 items-center">
            <label
              htmlFor="isJoint"
              className="text-sm font-medium text-gray-700"
            >
              Joint account
            </label>
            <FormikInput
              name="isJoint"
              disabled={isSubmitting}
              type="checkbox"
            />
          </div>
          <div className="flex flex-row justify-end gap-2">
            <ButtonFormSecondary
              onClick={() => setFormDisplayed(false)}
              disabled={isSubmitting}
            >
              Cancel
            </ButtonFormSecondary>
            <ButtonFormPrimary
              disabled={!values.name || isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Adding…" : "Add"}
            </ButtonFormPrimary>
          </div>

          <div>{apiError && <span>{apiError}</span>}</div>
        </Form>
      )}
    </Formik>
  );
};
