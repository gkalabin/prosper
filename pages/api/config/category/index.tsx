import { Prisma } from "@prisma/client";
import { authenticatedApiRoute } from "lib/authenticatedApiRoute";
import prisma from "lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";
import { User } from "pages/api/user";

async function handle(user: User, req: NextApiRequest, res: NextApiResponse) {
  const { name, parentCategoryId, displayOrder } = req.body;
  const dbArgs: Prisma.CategoryCreateArgs = {
    data: { name, displayOrder },
  };
  if (parentCategoryId) {
    dbArgs.data.parentCategory = { connect: { id: parentCategoryId } };
  }
  const result = await prisma.category.create(dbArgs);
  res.json(result);
}

export default authenticatedApiRoute("POST", handle);
