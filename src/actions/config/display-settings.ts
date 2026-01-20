'use server';
import {getUserIdOrRedirect} from '@/lib/auth/user';
import {DB} from '@/lib/db';
import {updateCoreDataCache} from '@/lib/db/cache';
import {
  DisplaySettingsFormSchema,
  displaySettingsFormValidationSchema,
} from '@/lib/form-types/DisplaySettingsFormSchema';
import {findByCode} from '@/lib/model/Currency';
import prisma from '@/lib/prisma';
import {DisplaySettings} from '@prisma/client';
import {type typeToFlattenedError} from 'zod';

export type UpdateDisplaySettingsResult =
  | {
      status: 'SUCCESS';
      data: DisplaySettings;
    }
  | {
      status: 'CLIENT_ERROR';
      errors: typeToFlattenedError<DisplaySettingsFormSchema>;
    };

export async function updateDisplaySettings(
  unsafeData: DisplaySettingsFormSchema
): Promise<UpdateDisplaySettingsResult> {
  const userId = await getUserIdOrRedirect();
  const validatedData =
    displaySettingsFormValidationSchema.safeParse(unsafeData);
  if (!validatedData.success) {
    return {
      status: 'CLIENT_ERROR',
      errors: validatedData.error.flatten(),
    };
  }
  const {displayCurrencyCode, excludeCategoryIdsInStats} = validatedData.data;
  const currency = findByCode(displayCurrencyCode);
  if (!currency) {
    return {
      status: 'CLIENT_ERROR',
      errors: {
        formErrors: [`Unknown currency ${displayCurrencyCode}`],
        fieldErrors: {},
      },
    };
  }
  const db = new DB({userId});
  const allCategories = await db.categoryFindMany();
  const known = new Set<number>(allCategories.map(c => c.id));
  const unknownCategories = excludeCategoryIdsInStats.filter(
    id => !known.has(id)
  );
  if (unknownCategories.length > 0) {
    return {
      status: 'CLIENT_ERROR',
      errors: {
        formErrors: [
          `Following categories are not found: ${unknownCategories}`,
        ],
        fieldErrors: {},
      },
    };
  }
  const result = await prisma.displaySettings.update({
    data: {
      displayCurrencyCode,
      excludeCategoryIdsInStats: excludeCategoryIdsInStats.join(','),
    },
    where: {userId},
  });
  await updateCoreDataCache(userId);
  return {status: 'SUCCESS', data: result};
}
