import { BankAccount as DBBankAccount } from "@prisma/client";
import { FormikInput, FormikMoneyInput } from "components/forms/Input";
import { SelectNumber } from "components/forms/Select";
import {
  AddOrUpdateButtonText,
  ButtonFormPrimary,
  ButtonFormSecondary,
} from "components/ui/buttons";
import { Form, Formik } from "formik";
import { Bank, BankAccount } from "lib/model/BankAccount";
import { Currencies } from "lib/model/Currency";
import Link from "next/link";
import { useState } from "react";

export const AddOrEditAccountForm = ({
  bank,
  bankAccount,
  currencies,
  onAddedOrUpdated,
  onClose,
}: {
  bankAccount?: BankAccount;
  bank: Bank;
  currencies: Currencies;
  onAddedOrUpdated: (x: DBBankAccount) => void;
  onClose: () => void;
}) => {
  const [apiError, setApiError] = useState("");
  const addingNewAccount = !bankAccount;
  let initialValues = {
    name: "",
    currencyId: currencies.all()[0]?.id,
    isJoint: false,
    isArchived: false,
    initialBalance: 0,
    displayOrder: 100 * bank.accounts.length,
  };
  if (bankAccount) {
    initialValues = {
      name: bankAccount.name,
      currencyId: bankAccount.currency.id,
      isJoint: bankAccount.isJoint(),
      isArchived: bankAccount.isArchived(),
      initialBalance: bankAccount.initialBalanceCents / 100,
      displayOrder: bankAccount.displayOrder,
    };
  }

  const handleSubmit = async (values) => {
    setApiError("");
    try {
      const body = {
        ...values,
        bankId: bank.id,
      };
      const added = await fetch(
        `/api/config/bank-account/${addingNewAccount ? "" : bankAccount.id}`,
        {
          method: addingNewAccount ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      onAddedOrUpdated(await added.json());
    } catch (error) {
      setApiError(`Failed to add: ${error}`);
    }
  };

  if (!currencies.all().length) {
    return (
      <>
        To add a bank account, first{" "}
        <Link href="/config/currencies">
          <a>add a currency.</a>
        </Link>
      </>
    );
  }
  return (
    <Formik initialValues={initialValues} onSubmit={handleSubmit}>
      {({ isSubmitting, values }) => (
        <Form className="flex max-w-xs flex-col gap-2 px-4 pb-6 pt-2">
          <h3 className="mb-2 text-xl font-medium leading-5">
            {addingNewAccount
              ? "Add New Bank Account"
              : `Edit ${bankAccount.name}`}
          </h3>
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Account Name
            </label>
            <FormikInput autoFocus name="name" className="w-full" />
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
              value={values.currencyId}
            >
              {currencies.all().map((x) => (
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
            <FormikMoneyInput name="initialBalance" className="w-full" />
          </div>
          <div className="flex flex-row items-center gap-3">
            <label
              htmlFor="isJoint"
              className="text-sm font-medium text-gray-700"
            >
              Joint
            </label>
            <FormikInput name="isJoint" type="checkbox" />
          </div>
          <div className="flex flex-row items-center gap-3">
            <label
              htmlFor="isArchived"
              className="text-sm font-medium text-gray-700"
            >
              Archived
            </label>
            <FormikInput name="isArchived" type="checkbox" />
          </div>
          <div className="flex flex-row justify-end gap-2">
            <ButtonFormSecondary onClick={onClose} disabled={isSubmitting}>
              Cancel
            </ButtonFormSecondary>
            <ButtonFormPrimary disabled={!values.name} type="submit">
              <AddOrUpdateButtonText add={!bankAccount} />
            </ButtonFormPrimary>
          </div>

          <div>{apiError && <span>{apiError}</span>}</div>
        </Form>
      )}
    </Formik>
  );
};
