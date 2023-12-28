import { authenticatedApiRoute } from "lib/authenticatedApiRoute";
import prisma from "lib/prisma";
import {
  addExtensionAndTrip,
  AddTransactionFormValues,
  includeExtensions,
  transactionDbInput,
} from "lib/transactionCreation";
import type { NextApiRequest, NextApiResponse } from "next";

async function handle(
  userId: number,
  req: NextApiRequest,
  res: NextApiResponse
) {
  const form = req.body as AddTransactionFormValues;
  const result = await prisma.$transaction(async (tx) => {
    let data = transactionDbInput(form, userId);
    data = await addExtensionAndTrip({ tx, data, form, userId, operation: "create" });
    return await tx.transaction.create(
      Object.assign({ data }, includeExtensions)
    );
  });
  res.json(result);
}

export default authenticatedApiRoute("POST", handle);
