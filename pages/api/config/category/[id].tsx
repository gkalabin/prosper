import { Prisma } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "lib/prisma";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const categoryId = parseInt(req.query.id as string);
  if (req.method === "PUT") {
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
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    );
  }
}
