'use client';
import {MultiSelect} from '@/components/MultiSelect';
import {Button} from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {Select} from '@/components/ui/html-select';
import {DisplaySettings} from '@/lib/displaySettings';
import {
  DisplaySettingsFormSchema,
  displaySettingsFormValidationSchema,
} from '@/lib/form-types/DisplaySettingsFormSchema';
import {
  categoryModelFromDB,
  getNameWithAncestors,
  makeCategoryTree,
  sortCategories,
} from '@/lib/model/Category';
import {allCurrencies} from '@/lib/model/Currency';
import {zodResolver} from '@hookform/resolvers/zod';
import {
  Category as DBCategory,
  DisplaySettings as DBDisplaySettings,
} from '@prisma/client';
import {useState} from 'react';
import {useForm} from 'react-hook-form';

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
  const handleSubmit = async (values: DisplaySettingsFormSchema) => {
    setApiError('');
    setSuccessMessage('');
    try {
      const response = await fetch(`/api/config/display-settings/`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(values),
      });
      if (response.status == 200) {
        setDbDisplaySettings(await response.json());
        setSuccessMessage('Successfully saved!');
      } else {
        console.error(await response.text());
        setApiError(`Failed to save: ${response.statusText}`);
      }
    } catch (error) {
      console.log(error);
      setApiError(`Failed to save: ${error}`);
    }
  };
  const form = useForm<DisplaySettingsFormSchema>({
    resolver: zodResolver(displaySettingsFormValidationSchema),
    defaultValues: {
      displayCurrencyCode: displaySettings.displayCurrency().code,
      excludeCategoryIdsInStats: displaySettings.excludeCategoryIdsInStats(),
    },
  });
  const tree = makeCategoryTree(categories);
  const categoryOptions = categories.map(c => ({
    value: c.id,
    label: getNameWithAncestors(c, tree),
  }));
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col gap-4"
      >
        {successMessage && (
          <div className="text-green-500">{successMessage}</div>
        )}
        <FormField
          control={form.control}
          name="displayCurrencyCode"
          render={({field}) => (
            <FormItem>
              <FormLabel>Display currency</FormLabel>
              <FormControl>
                <Select {...field} value={field.value ?? undefined}>
                  {allCurrencies().map(({code}) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="excludeCategoryIdsInStats"
          render={({field}) => (
            <FormItem>
              <FormLabel>Categories to exclude in stats</FormLabel>
              <FormControl>
                <MultiSelect options={categoryOptions} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Saving…' : 'Save'}
          </Button>
        </div>
        {apiError && (
          <div className="text-destructive text-sm font-medium">{apiError}</div>
        )}
      </form>
    </Form>
  );
}
