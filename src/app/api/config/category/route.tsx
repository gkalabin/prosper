import {getUserIdOrRedirect} from '@/lib/auth/user';
import {categoryFormValidationSchema} from '@/lib/form-types/CategoryFormSchema';
import prisma from '@/lib/prisma';
import {Prisma} from '@prisma/client';
import {NextRequest, NextResponse} from 'next/server';

export async function POST(request: NextRequest): Promise<Response> {
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

  const result = await prisma.$transaction(async tx => {
    const iid = (await tx.category.count({where: {userId}})) + 1;
    const data: Prisma.CategoryUncheckedCreateInput = {
      iid,
      name,
      displayOrder,
      userId,
    };
    if (parentCategoryId) {
      data.parentCategoryId = +parentCategoryId;
    }
    return await tx.category.create({data});
  });

  return NextResponse.json(result);
}
