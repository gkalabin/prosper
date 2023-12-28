import { Category as DBCategory } from "@prisma/client";
import { InputWithLabel, TextInputWithLabel } from "components/forms/Input";
import { FormikSelect } from "components/forms/Select";
import {
  AddOrUpdateButtonText,
  ButtonFormPrimary,
  ButtonFormSecondary,
} from "components/ui/buttons";
import { Form, Formik } from "formik";
import { Category } from "lib/model/Category";
import { useState } from "react";

export const AddOrEditCategoryForm = ({
  category,
  categories,
  onAddedOrUpdated,
  onClose,
}: {
  category?: Category;
  categories: Category[];
  onAddedOrUpdated: (addedOrUpdated: DBCategory) => void;
  onClose: () => void;
}) => {
  const [apiError, setApiError] = useState("");
  const handleSubmit = async (values) => {
    setApiError("");
    try {
      const body = { ...values };
      const response = await fetch(
        `/api/config/category/${category?.id() ?? ""}`,
        {
          method: category ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      onAddedOrUpdated(await response.json());
    } catch (error) {
      setApiError(`Failed to update: ${error}`);
    }
  };

  const initialValues = {
    name: category?.name() ?? "",
    displayOrder: category?.displayOrder() ?? categories.length * 100,
    parentCategoryId: category?.parent()?.id() ?? 0,
  };
  return (
    <Formik initialValues={initialValues} onSubmit={handleSubmit}>
      {({ isSubmitting, values }) => (
        <Form className="flex flex-col gap-4">
          <div>
            <TextInputWithLabel name="name" label="Category name" autoFocus />
          </div>
          <div>
            <InputWithLabel
              name="displayOrder"
              label="Display order (smaller on top)"
              type="number"
            />
          </div>
          <FormikSelect name="parentCategoryId">
            <option value="0">No parent</option>
            {categories.map((category) => (
              <option key={category.id()} value={category.id()}>
                {category.nameWithAncestors()}
              </option>
            ))}
          </FormikSelect>
          <div className="flex justify-end gap-2">
            <ButtonFormSecondary onClick={onClose} disabled={isSubmitting}>
              Cancel
            </ButtonFormSecondary>
            <ButtonFormPrimary type="submit" disabled={!values.name}>
              <AddOrUpdateButtonText add={!category} />
            </ButtonFormPrimary>
          </div>
          {apiError && <span>{apiError}</span>}
        </Form>
      )}
    </Formik>
  );
};
