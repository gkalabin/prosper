import {
  Category as DBCategory,
  DisplaySettings as DBDisplaySettings,
} from "@prisma/client";
import { ConfigPageLayout } from "components/ConfigPageLayout";
import { SelectNumber, undoTailwindInputStyles } from "components/forms/Select";
import { FormikButtonFormPrimary } from "components/ui/buttons";
import { Form, Formik } from "formik";
import { DB } from "lib/db";
import { DisplaySettings } from "lib/displaySettings";
import { Category, categoryModelFromDB } from "lib/model/Category";
import { Currency } from "lib/model/Currency";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "pages/api/auth/[...nextauth]";
import { useState } from "react";
import Select from "react-select";

function DispalySettings({
  displaySettings,
  categories,
  onSettingsUpdated,
}: {
  displaySettings?: DisplaySettings;
  categories: Category[];
  onSettingsUpdated: (updated: DBDisplaySettings) => void;
}) {
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
      onSettingsUpdated(await response.json());
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
            <SelectNumber
              name="displayCurrencyCode"
              disabled={isSubmitting}
              className="w-full"
              value={values.displayCurrencyCode}
            >
              {Currency.all().map((x) => (
                <option key={x.code()} value={x.code()}>
                  {x.code()}
                </option>
              ))}
            </SelectNumber>
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
                  x.map((x) => x.value)
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

export const getServerSideProps: GetServerSideProps<{
  data?: {
    dbDisplaySettings: DBDisplaySettings;
    dbCategories: DBCategory[];
  };
}> = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session) {
    return { props: {} };
  }
  const userId = +session.user.id;
  const db = new DB({ userId });
  const dbDisplaySettings = await db.getOrCreateDbDisplaySettings();
  const dbCategories = await db.categoryFindMany();
  const props = {
    session,
    data: { dbDisplaySettings, dbCategories, userId },
  };
  return {
    props: JSON.parse(JSON.stringify(props)),
  };
};

const Page = ({
  data: { dbDisplaySettings: initialDbDisplaySettings, dbCategories },
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const [dbDisplaySettings, setDisplaySettings] = useState(
    initialDbDisplaySettings
  );
  const categories = categoryModelFromDB(dbCategories);
  const displaySettings = new DisplaySettings(dbDisplaySettings);

  return (
    <ConfigPageLayout>
      <h1 className="mb-6 text-2xl leading-7">Display settings</h1>
      <DispalySettings
        displaySettings={displaySettings}
        onSettingsUpdated={setDisplaySettings}
        categories={categories}
      />
    </ConfigPageLayout>
  );
};

export default Page;
