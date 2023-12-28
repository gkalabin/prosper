"use client";
import {
  Category as DBCategory,
  DisplaySettings as DBDisplaySettings,
} from "@prisma/client";
import { FormikSelect, undoTailwindInputStyles } from "components/forms/Select";
import { FormikButtonFormPrimary } from "components/ui/buttons";
import { Form, Formik } from "formik";
import { DisplaySettings } from "lib/displaySettings";
import { categoryModelFromDB } from "lib/model/Category";
import { Currency } from "lib/model/Currency";
import { useState } from "react";
import Select from "react-select";

export function DispalySettings({
  dbDisplaySettings: initialDbDisplaySettings,
  dbCategories,
}: {
  dbDisplaySettings?: DBDisplaySettings;
  dbCategories: DBCategory[];
}) {
  const categories = categoryModelFromDB(dbCategories);
  const [dbDisplaySettings, setDbDisplaySettings] = useState(
    initialDbDisplaySettings,
  );
  const displaySettings = new DisplaySettings(dbDisplaySettings);
  const [apiError, setApiError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const handleSubmit = async (values) => {
    setApiError("");
    setSuccessMessage("");
    try {
      const body = {
        ...values,
      };
      const response = await fetch(`/api/config/display-settings/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setDbDisplaySettings(await response.json());
      setSuccessMessage("Successfully saved!");
    } catch (error) {
      console.log(error);
      setApiError(`Failed to save: ${error}`);
    }
  };
  const categoryOptions = categories.map((a) => ({
    value: a.id(),
    label: a.nameWithAncestors(),
  }));
  const initialValues = {
    displayCurrencyCode: displaySettings.displayCurrency().code(),
    excludeCategoryIdsInStats: displaySettings.excludeCategoryIdsInStats(),
  };
  return (
    <Formik initialValues={initialValues} onSubmit={handleSubmit}>
      {({ isSubmitting, values, setFieldValue }) => (
        <Form className="space-y-4">
          {successMessage && (
            <div className="text-green-500">{successMessage}</div>
          )}
          <div>
            <label
              htmlFor="displayCurrencyCode"
              className="block text-sm font-medium text-gray-700"
            >
              Display currency
            </label>
            <FormikSelect
              name="displayCurrencyCode"
              className="w-full"
              value={values.displayCurrencyCode}
            >
              {Currency.all().map((x) => (
                <option key={x.code()} value={x.code()}>
                  {x.code()}
                </option>
              ))}
            </FormikSelect>
          </div>
          <div>
            <label
              htmlFor="excludeCategoryIdsInStats"
              className="block text-sm font-medium text-gray-700"
            >
              Categories to exclude in stats
            </label>
            <Select
              instanceId="excludeCategoryIdsInStats"
              styles={undoTailwindInputStyles()}
              options={categoryOptions}
              isMulti
              value={values.excludeCategoryIdsInStats.map((x) => ({
                label: categoryOptions.find((c) => c.value == x).label,
                value: x,
              }))}
              onChange={(x) =>
                setFieldValue(
                  "excludeCategoryIdsInStats",
                  x.map((x) => x.value),
                )
              }
            />
          </div>
          <div className="flex justify-end gap-2">
            <FormikButtonFormPrimary type="submit">
              {isSubmitting ? "Saving…" : "Save"}
            </FormikButtonFormPrimary>
          </div>
          {apiError && <div className="text-red-500">{apiError}</div>}
        </Form>
      )}
    </Formik>
  );
}
