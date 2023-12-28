import { Bank as DBBank } from "@prisma/client";
import { FormikInput } from "components/forms/Input";
import {
  ButtonFormPrimary,
  ButtonFormSecondary,
  ButtonPagePrimary,
} from "components/ui/buttons";
import { Form, Formik } from "formik";
import { useState } from "react";

export const AddBankForm = (props: {
  displayOrder: number;
  onAdded: (added: DBBank) => void;
}) => {
  const [formDisplayed, setFormDisplayed] = useState(false);
  const [apiError, setApiError] = useState("");

  const handleSubmit = async ({ name }) => {
    setApiError("");
    try {
      const body = {
        name,
        displayOrder: props.displayOrder,
      };
      const added = await fetch("/api/config/bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      props.onAdded(await added.json());
      setFormDisplayed(false);
    } catch (error) {
      setApiError(`Failed to add: ${error}`);
    }
  };

  if (!formDisplayed) {
    return (
      <div className="flex justify-end">
        <ButtonPagePrimary onClick={() => setFormDisplayed(true)}>
          Add New Bank
        </ButtonPagePrimary>
      </div>
    );
  }
  return (
    <Formik initialValues={{ name: "" }} onSubmit={handleSubmit}>
      {({ isSubmitting, values }) => (
        <Form className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Bank Name
            </label>
            <FormikInput
              name="name"
              autoFocus
              className="block w-full"
              disabled={isSubmitting}
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
              disabled={isSubmitting || !values.name}
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
