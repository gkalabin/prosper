import { Prisma } from "@prisma/client";
import prisma from "../../../lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

type NewTransactionInput = {
  timestamp: number;
  description: string;
  amountCents: number;
  categoryId: number;
};

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    const input = req.body as NewTransactionInput;
    const dbArgs: Prisma.TransactionCreateArgs = {
      data: {
        timestamp: new Date(input.timestamp),
        description: input.description,
        amountCents: input.amountCents,
        category: {
          connect: {
            id: input.categoryId,
          },
        },
      },
    };
    const result = await prisma.transaction.create(dbArgs);
    res.json(result);
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    );
  }
}
