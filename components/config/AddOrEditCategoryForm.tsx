import { Category as DBCategory } from "@prisma/client";
import { InputWithLabel, TextInputWithLabel } from "components/forms/Input";
import { FormikSelect } from "components/forms/Select";
import {
  AddOrUpdateButtonText,
  FormikButtonFormPrimary,
  FormikButtonFormSecondary,
} from "components/ui/buttons";
import { Form, Formik } from "formik";
import { Category } from "lib/model/Category";
import { CategoryFormValues } from "lib/model/forms/CategoryFormValues";
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
  const handleSubmit = async (values: CategoryFormValues) => {
    setApiError("");
    try {
      const response = await fetch(
        `/api/config/category/${category?.id() ?? ""}`,
        {
          method: category ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        },
      );
      onAddedOrUpdated(await response.json());
    } catch (error) {
      setApiError(`Failed to update: ${error}`);
    }
  };

  const initialValues: CategoryFormValues = {
    name: category?.name() ?? "",
    displayOrder: category?.displayOrder() ?? categories.length * 100,
    parentCategoryId: category?.parent()?.id() ?? 0,
  };
  return (
    <Formik initialValues={initialValues} onSubmit={handleSubmit}>
      {({ values }) => (
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
            <FormikButtonFormSecondary onClick={onClose}>
              Cancel
            </FormikButtonFormSecondary>
            <FormikButtonFormPrimary type="submit" disabled={!values.name}>
              <AddOrUpdateButtonText add={!category} />
            </FormikButtonFormPrimary>
          </div>
          {apiError && <span>{apiError}</span>}
        </Form>
      )}
    </Formik>
  );
};
