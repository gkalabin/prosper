import { Prisma } from "@prisma/client";
import prisma from "../../../../lib/prisma";

export default async function handle(req, res) {
  if (req.method === "POST") {
    const { name, parentCategoryId, displayOrder } = req.body;
    let dbArgs: Prisma.CategoryCreateArgs = {
      data: { name, displayOrder },
    };
    if (parentCategoryId) {
      dbArgs.data.parentCategory = { connect: { id: parentCategoryId } };
    }
    const result = await prisma.category.create(dbArgs);
    console.debug("CreateCategory", result);
    res.json(result);
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    );
  }
}
