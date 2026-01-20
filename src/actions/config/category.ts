'use server';
import {getUserIdOrRedirect} from '@/lib/auth/user';
import {DB} from '@/lib/db';
import {updateCoreDataCache} from '@/lib/db/cache';
import {
  CategoryFormSchema,
  categoryFormValidationSchema,
} from '@/lib/form-types/CategoryFormSchema';
import prisma from '@/lib/prisma';
import {Category} from '@prisma/client';
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
  const userId = await getUserIdOrRedirect();
  const validatedData = categoryFormValidationSchema.safeParse(unsafeData);
  if (!validatedData.success) {
    return {
      status: 'CLIENT_ERROR',
      errors: validatedData.error.flatten(),
    };
  }
  const {name, parentCategoryId, displayOrder} = validatedData.data;

  if (!categoryId) {
    // Create new category
    const result = await prisma.category.create({
      data: {
        name,
        displayOrder,
        userId,
        parentCategoryId: parentCategoryId ? +parentCategoryId : null,
      },
    });
    await updateCoreDataCache(userId);
    return {status: 'SUCCESS', data: result};
  }

  // Update existing category
  const db = new DB({userId});
  const found = await db.categoryFindMany({where: {id: categoryId}});
  if (!found?.length) {
    return {
      status: 'CLIENT_ERROR',
      errors: {
        formErrors: [`Category with id ${categoryId} is not found`],
        fieldErrors: {},
      },
    };
  }
  const result = await prisma.category.update({
    data: {
      name,
      displayOrder,
      parentCategoryId: parentCategoryId ? +parentCategoryId : null,
    },
    where: {id: categoryId},
  });
  await updateCoreDataCache(userId);
  return {status: 'SUCCESS', data: result};
}
