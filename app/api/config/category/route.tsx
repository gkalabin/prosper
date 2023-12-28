import { Prisma } from "@prisma/client";
import { CreateCategoryRequest } from "lib/model/forms/CategoryFormValues";
import prisma from "lib/prisma";
import { getUserId } from "lib/user";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest): Promise<Response> {
  const userId = await getUserId();
  const { name, parentCategoryId, displayOrder } =
    (await request.json()) as CreateCategoryRequest;
  const dbArgs: Prisma.CategoryCreateArgs = {
    data: { name, displayOrder, userId },
  };
  if (parentCategoryId) {
    dbArgs.data.parentCategoryId = +parentCategoryId;
  }
  const result = await prisma.category.create(dbArgs);
  return NextResponse.json(result);
}
