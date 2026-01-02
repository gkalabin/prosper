import {getUserIdOrRedirect} from '@/lib/auth/user';
import {DB} from '@/lib/db';
import {invalidateCoreDataCache} from '@/lib/db/cache';
import {categoryFormValidationSchema} from '@/lib/form-types/CategoryFormSchema';
import prisma from '@/lib/prisma';
import {positiveIntOrNull} from '@/lib/util/searchParams';
import {Prisma} from '@prisma/client';
import {NextRequest, NextResponse} from 'next/server';

export async function PUT(
  request: NextRequest,
  {params}: {params: Promise<{categoryId: string}>}
): Promise<Response> {
  const userId = await getUserIdOrRedirect();
  const validatedData = categoryFormValidationSchema.safeParse(
    await request.json()
  );
  if (!validatedData.success) {
    return new Response(`Invalid form`, {
      status: 400,
    });
  }
  const {name, parentCategoryId, displayOrder} = validatedData.data;
  const categoryId = positiveIntOrNull((await params).categoryId);
  if (!categoryId) {
    return new Response(`categoryId must be an integer`, {status: 400});
  }
  // Verify user has access.
  const db = new DB({userId});
  const found = await db.categoryFindMany({
    where: {
      id: categoryId,
    },
  });
  if (!found?.length) {
    return new Response(`Not authenticated`, {status: 401});
  }
  // Perform update.
  const dbArgs: Prisma.CategoryUpdateArgs = {
    data: {name, displayOrder},
    where: {id: categoryId},
  };
  if (parentCategoryId) {
    dbArgs.data.parentCategoryId = +parentCategoryId;
  }
  const result = await prisma.category.update(dbArgs);
  await invalidateCoreDataCache(userId);
  return NextResponse.json(result);
}
