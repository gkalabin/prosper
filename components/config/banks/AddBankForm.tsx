import { Bank as DBBank } from "@prisma/client";
import { FormikInput } from "components/forms/Input";
import {
  AddOrUpdateButtonText,
  ButtonFormPrimary,
  ButtonFormSecondary,
} from "components/ui/buttons";
import { Form, Formik } from "formik";
import { Bank } from "lib/model/BankAccount";
import { useState } from "react";

export const AddOrEditBankForm = ({
  bank,
  displayOrder,
  onAddedOrUpdated,
  onCancelClick,
}: {
  bank?: Bank;
  displayOrder: number;
  onAddedOrUpdated: (x: DBBank) => void;
  onCancelClick: () => void;
}) => {
  const [apiError, setApiError] = useState("");
  const isCreate = !bank;

  const handleSubmit = async ({ name }) => {
    setApiError("");
    try {
      const body = {
        name,
        displayOrder,
      };
      const dbDbank = await fetch(
        `/api/config/bank/${isCreate ? "" : bank.id}`,
        {
          method: isCreate ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      onAddedOrUpdated(await dbDbank.json());
    } catch (error) {
      setApiError(`Failed to add: ${error}`);
    }
  };

  let initialValues = {
    name: "",
    displayOrder,
  };
  if (bank) {
    initialValues = {
      name: bank.name,
      displayOrder: bank.displayOrder,
    };
  }

  return (
    <Formik initialValues={initialValues} onSubmit={handleSubmit}>
      {({ isSubmitting, values }) => (
        <Form className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Bank Name
            </label>
            <FormikInput name="name" autoFocus className="block w-full" />
          </div>

          <div className="flex flex-row justify-end gap-2">
            <ButtonFormSecondary
              onClick={onCancelClick}
              disabled={isSubmitting}
            >
              Cancel
            </ButtonFormSecondary>
            <ButtonFormPrimary
              disabled={isSubmitting || !values.name}
              type="submit"
            >
              <AddOrUpdateButtonText add={isCreate} />
            </ButtonFormPrimary>
          </div>

          <div>{apiError && <span>{apiError}</span>}</div>
        </Form>
      )}
    </Formik>
  );
};
