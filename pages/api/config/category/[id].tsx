import { Prisma } from "@prisma/client";
import { authenticatedApiRoute } from "lib/authenticatedApiRoute";
import prisma from "lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

async function handle(
  userName: string,
  req: NextApiRequest,
  res: NextApiResponse
) {
  const categoryId = parseInt(req.query.id as string);
  const { name, parentCategoryId, displayOrder } = req.body;

  const dbArgs: Prisma.CategoryUpdateArgs = {
    data: { name, displayOrder },
    where: { id: categoryId },
  };
  if (parentCategoryId) {
    dbArgs.data.parentCategory = { connect: { id: parentCategoryId } };
  }
  const result = await prisma.category.update(dbArgs);
  res.json(result);
}

export default authenticatedApiRoute("PUT", handle);
