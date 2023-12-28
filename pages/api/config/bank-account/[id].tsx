import { Prisma } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../lib/prisma";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const id = parseInt(req.query.id as string);
  if (req.method === "PUT") {
    const { name, displayOrder, currencyId } = req.body;

    const dbArgs: Prisma.BankAccountUpdateArgs = {
      data: {
        name,
        displayOrder,
        currencyId,
      },
      where: { id: id },
      include: {
        currency: true,
      },
    };
    const result = await prisma.bankAccount.update(dbArgs);
    res.json(result);
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    );
  }
}
