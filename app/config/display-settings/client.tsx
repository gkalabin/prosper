'use client';
import {
  Category as DBCategory,
  DisplaySettings as DBDisplaySettings,
} from '@prisma/client';
import {ExcludedCategoriesSelector} from 'app/stats/ExcludedCategoriesSelector';
import {FormikSelect} from 'components/forms/Select';
import {FormikButtonFormPrimary} from 'components/ui/buttons';
import {Form, Formik} from 'formik';
import {DisplaySettings} from 'lib/displaySettings';
import {categoryModelFromDB, sortCategories} from 'lib/model/Category';
import {allCurrencies} from 'lib/model/Currency';
import {DisplaySettingsFormValues} from 'lib/model/api/DisplaySettingsConfig';
import {useState} from 'react';

export function DisplaySettingsPage({
  dbDisplaySettings: initialDbDisplaySettings,
  dbCategories,
}: {
  dbDisplaySettings: DBDisplaySettings;
  dbCategories: DBCategory[];
}) {
  const categories = sortCategories(dbCategories.map(categoryModelFromDB));
  const [dbDisplaySettings, setDbDisplaySettings] = useState(
    initialDbDisplaySettings
  );
  const displaySettings = new DisplaySettings(dbDisplaySettings);
  const [apiError, setApiError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const handleSubmit = async (values: DisplaySettingsFormValues) => {
    setApiError('');
    setSuccessMessage('');
    try {
      const response = await fetch(`/api/config/display-settings/`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(values),
      });
      setDbDisplaySettings(await response.json());
      setSuccessMessage('Successfully saved!');
    } catch (error) {
      console.log(error);
      setApiError(`Failed to save: ${error}`);
    }
  };
  const initialValues: DisplaySettingsFormValues = {
    displayCurrencyCode: displaySettings.displayCurrency().code,
    excludeCategoryIdsInStats: displaySettings.excludeCategoryIdsInStats(),
  };
  return (
    <Formik initialValues={initialValues} onSubmit={handleSubmit}>
      {({isSubmitting, values, setFieldValue}) => (
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
              {allCurrencies().map(x => (
                <option key={x.code} value={x.code}>
                  {x.code}
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
            <ExcludedCategoriesSelector
              excludedIds={values.excludeCategoryIdsInStats}
              setExcludedIds={v =>
                setFieldValue('excludeCategoryIdsInStats', v)
              }
              allCategories={categories}
            />
          </div>
          <div className="flex justify-end gap-2">
            <FormikButtonFormPrimary type="submit">
              {isSubmitting ? 'Saving…' : 'Save'}
            </FormikButtonFormPrimary>
          </div>
          {apiError && <div className="text-red-500">{apiError}</div>}
        </Form>
      )}
    </Formik>
  );
}
