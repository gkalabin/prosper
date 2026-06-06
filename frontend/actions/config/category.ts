'use server';
import {getAuthContextOrRedirect} from '@/lib/auth/user';
import {
  CategoryFormSchema,
  categoryFormValidationSchema,
} from '@/lib/form-types/CategoryFormSchema';
import {withAuth} from '@/lib/grpc/auth';
import {ledgerClient} from '@/lib/grpc/client';
import {Category} from '@/lib/grpc/gen/prosper/v1/ledger';
import {type typeToFlattenedError} from 'zod';

export type UpsertCategoryResult =
  | {
      status: 'SUCCESS';
      data: Category;
    }
  | {
      status: 'CLIENT_ERROR';
      errors: typeToFlattenedError<CategoryFormSchema>;
    };

export async function upsertCategory(
  categoryId: number | null,
  unsafeData: CategoryFormSchema
): Promise<UpsertCategoryResult> {
  const auth = await getAuthContextOrRedirect();
  const validatedData = categoryFormValidationSchema.safeParse(unsafeData);
  if (!validatedData.success) {
    return {
      status: 'CLIENT_ERROR',
      errors: validatedData.error.flatten(),
    };
  }
  const {response} = await ledgerClient.upsertCategory(
    withAuth(
      {
        category: {
          id: categoryId ?? 0,
          ...validatedData.data,
        },
      },
      auth
    )
  );
  return {
    status: 'SUCCESS',
    data: {
      id: response.categoryId,
      ...validatedData.data,
    },
  };
}
