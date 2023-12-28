import { authenticatedApiRoute } from "lib/authenticatedApiRoute";
import prisma from "lib/prisma";
import {
  AddTransactionFormValues,
  includeExtensions,
  TransactionAPIResponse,
  transactionDbInput,
  writeExtension,
  writeTags,
  writeTrip,
} from "lib/transactionCreation";
import type { NextApiRequest, NextApiResponse } from "next";

async function handle(
  userId: number,
  req: NextApiRequest,
  res: NextApiResponse
) {
  const form = req.body as AddTransactionFormValues;
  const result: TransactionAPIResponse = await prisma.$transaction(
    async (tx) => {
      const data = transactionDbInput(form, userId);
      writeExtension({ data, form, userId, operation: "create" });
      const { createdTrip } = await writeTrip({ tx, data, form, userId });
      const { createdTags } = await writeTags({ tx, data, form, userId });
      const createdTransaction = await tx.transaction.create(
        Object.assign({ data }, includeExtensions)
      );
      return {
        transaction: createdTransaction,
        trip: createdTrip,
        tags: createdTags,
      };
    }
  );
  res.json(result);
}

export default authenticatedApiRoute("POST", handle);
