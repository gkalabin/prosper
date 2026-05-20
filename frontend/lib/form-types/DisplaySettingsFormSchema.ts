import {findByCode} from '@/lib/model/Currency';
import {z} from 'zod';

export const displaySettingsFormValidationSchema = z
  .object({
    displayCurrencyCode: z.string(),
    excludeCategoryIdsInStats: z.array(z.number().positive()),
  })
  .refine(
    data => {
      const c = findByCode(data.displayCurrencyCode);
      return !!c;
    },
    {
      message: 'Currency is not known',
    }
  );

export type DisplaySettingsFormSchema = z.infer<
  typeof displaySettingsFormValidationSchema
>;
