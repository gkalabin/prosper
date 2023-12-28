import { Prisma } from "@prisma/client";
import prisma from "lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    const { name, displayOrder, bankId, currencyId } = req.body;
    const dbArgs: Prisma.BankAccountCreateArgs = {
      data: {
        name,
        displayOrder,
        bank: { connect: { id: bankId } },
        currency: { connect: { id: currencyId } },
      },
      include: {
        currency: true,
      },
    };
    const result = await prisma.bankAccount.create(dbArgs);
    res.json(result);
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    );
  }
}
