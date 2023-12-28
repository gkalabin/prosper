import { Prisma } from "@prisma/client";
import { authenticatedApiRoute } from "lib/authenticatedApiRoute";
import prisma from "lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

async function handle(
  userId: number,
  req: NextApiRequest,
  res: NextApiResponse
) {
  const categoryId = parseInt(req.query.id as string);
  const { name, parentCategoryId, displayOrder } = req.body;
  if (!hasAccess({ categoryId, userId })) {
    res.status(401).send(`Not authenticated`);
    return;
  }

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

async function hasAccess({
  categoryId,
  userId,
}: {
  categoryId: number;
  userId: number;
}): Promise<boolean> {
  const found = await prisma.category.findFirst({
    where: {
      id: categoryId,
      userId,
    },
  });
  return !!found;
}

export default authenticatedApiRoute("PUT", handle);
