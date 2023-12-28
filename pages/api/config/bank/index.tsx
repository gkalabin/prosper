import { Prisma } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../lib/prisma";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    const { name, displayOrder } = req.body;
    const dbArgs: Prisma.BankCreateArgs = {
      data: { name, displayOrder },
      include: {
        accounts: {
          include: { currency: true },
        },
      },
    };
    const result = await prisma.bank.create(dbArgs);
    res.json(result);
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    );
  }
}
