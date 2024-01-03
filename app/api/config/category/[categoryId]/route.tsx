import {Prisma} from '@prisma/client';
import {DB} from 'lib/db';
import {UpdateCategoryRequest} from 'lib/model/forms/CategoryFormValues';
import prisma from 'lib/prisma';
import {getUserId} from 'lib/user';
import {intParam} from 'lib/util/searchParams';
import {NextRequest, NextResponse} from 'next/server';

export async function PUT(
  request: NextRequest,
  {params}: {params: {categoryId: string}}
): Promise<Response> {
  const categoryId = intParam(params.categoryId);
  if (!categoryId) {
    return new Response(`categoryId must be an integer`, {status: 400});
  }
  const {name, parentCategoryId, displayOrder} =
    (await request.json()) as UpdateCategoryRequest;
  const userId = await getUserId();
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
  return NextResponse.json(result);
}
