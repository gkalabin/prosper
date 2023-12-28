import { Prisma } from "@prisma/client";
import { authenticatedApiRoute } from "lib/authenticatedApiRoute";
import { DB } from "lib/db";
import prisma from "lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

async function handle(
  userId: number,
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Parse input.
  const categoryId = parseInt(req.query.id as string);
  const { name, parentCategoryId, displayOrder } = req.body;
  // Verify user has access.
  const db = new DB({ userId });
  const found = await db.categoryFindMany({
    where: {
      id: categoryId,
    },
  });
  if (!found?.length) {
    res.status(401).send(`Not authenticated`);
    return;
  }
  // Perform update.
  const dbArgs: Prisma.CategoryUpdateArgs = {
    data: { name, displayOrder },
    where: { id: categoryId },
  };
  dbArgs.data.parentCategoryId = +parentCategoryId || null;
  const result = await prisma.category.update(dbArgs);
  res.json(result);
}

export default authenticatedApiRoute("PUT", handle);
