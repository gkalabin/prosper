import { Prisma } from "@prisma/client";
import prisma from "../../../lib/prisma";

export default async function handle(req, res) {
  const categoryId = parseInt(req.query.id);
  if (req.method === "PUT") {
    const { name, parentCategoryId, displayOrder } = req.body;

    let dbArgs: Prisma.CategoryUpdateArgs = {
      data: { name, displayOrder },
      where: { id: categoryId },
    };
    if (parentCategoryId) {
      dbArgs.data.parentCategory = { connect: { id: parentCategoryId } };
    }
    const result = await prisma.category.update(dbArgs);
    console.debug("UpdateCategory", result);
    res.json(result);
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    );
  }
}
