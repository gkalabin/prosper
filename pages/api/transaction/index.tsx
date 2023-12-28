import prisma from "../../../lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";
import {
  AddTransactionDTO,
  dtoToDb,
} from "../../../lib/AddTransactionDataModels";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    const input = req.body as AddTransactionDTO;
    const dbArgs = dtoToDb(input);
    const result = await prisma.transaction.create(dbArgs);
    res.json(result);
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    );
  }
}
