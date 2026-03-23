'use server';
import {getAuthContextOrRedirect} from '@/lib/auth/user';
import {
  cachedCoreDataOrFetch,
  invalidateMarketDataCache,
  updateCoreDataCache,
} from '@/lib/db/cache';
import {
  DisplaySettingsFormSchema,
  displaySettingsFormValidationSchema,
} from '@/lib/form-types/DisplaySettingsFormSchema';
import {withAuth} from '@/lib/grpc/auth';
import {ledgerClient} from '@/lib/grpc/client';
import {DisplaySettings} from '@/lib/grpc/gen/prosper/v1/ledger';
import {findByCode} from '@/lib/model/Currency';
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
  const auth = await getAuthContextOrRedirect();
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
  const core = await cachedCoreDataOrFetch(auth);
  const known = new Set<number>(core.categories.map(c => c.id));
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
  await ledgerClient.updateDisplaySettings(
    withAuth({settings: {displayCurrencyCode, excludeCategoryIdsInStats}}, auth)
  );
  await updateCoreDataCache(auth.userId);
  // The display currency drives which exchange pairs the market-data
  // fetcher requests, so the market cache is stale after a change.
  await invalidateMarketDataCache(auth.userId);
  return {
    status: 'SUCCESS',
    data: {
      displayCurrencyCode,
      excludeCategoryIdsInStats,
    },
  };
}
