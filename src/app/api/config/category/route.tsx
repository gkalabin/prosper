import {categoryFormValidationSchema} from '@/lib/form-types/CategoryFormSchema';
import prisma from '@/lib/prisma';
import {getUserId} from '@/lib/user';
import {Prisma} from '@prisma/client';
import {NextRequest, NextResponse} from 'next/server';

export async function POST(request: NextRequest): Promise<Response> {
  const userId = await getUserId();
  const validatedData = categoryFormValidationSchema.safeParse(
    await request.json()
  );
  if (!validatedData.success) {
    return new Response(`Invalid form`, {
      status: 400,
    });
  }
  const {name, parentCategoryId, displayOrder} = validatedData.data;
  const dbArgs: Prisma.CategoryCreateArgs = {
    data: {name, displayOrder, userId},
  };
  if (parentCategoryId) {
    dbArgs.data.parentCategoryId = +parentCategoryId;
  }
  const result = await prisma.category.create(dbArgs);
  return NextResponse.json(result);
}
