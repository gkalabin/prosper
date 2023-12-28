import { Prisma } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../lib/prisma";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    const { name, parentCategoryId, displayOrder } = req.body;
    const dbArgs: Prisma.CategoryCreateArgs = {
      data: { name, displayOrder },
    };
    if (parentCategoryId) {
      dbArgs.data.parentCategory = { connect: { id: parentCategoryId } };
    }
    const result = await prisma.category.create(dbArgs);
    res.json(result);
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    );
  }
}
