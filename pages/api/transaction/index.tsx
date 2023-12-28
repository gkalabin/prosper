import { authenticatedApiRoute } from "lib/authenticatedApiRoute";
import prisma from "lib/prisma";
import {
  includeExtensionsAndTags,
  TransactionAPIRequest,
  TransactionAPIResponse,
  transactionDbInput,
  writeExtension,
  writeTags,
  writeTrip,
  writeUsedPrototypes,
} from "lib/transactionDbUtils";
import type { NextApiRequest, NextApiResponse } from "next";

async function handle(
  userId: number,
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { form, usedPrototype } = req.body as TransactionAPIRequest;
  const result: TransactionAPIResponse = await prisma.$transaction(
    async (tx) => {
      const data = transactionDbInput(form, userId);
      writeExtension({ data, form, userId, operation: "create" });
      const createdTrip = await writeTrip({ tx, data, form, userId });
      const { createdTags } = await writeTags({ tx, data, form, userId });
      const createdTransaction = await tx.transaction.create(
        Object.assign({ data }, includeExtensionsAndTags)
      );
      const { createdPrototypes } = await writeUsedPrototypes({
        usedPrototype,
        createdTransactionId: createdTransaction.id,
        userId,
        tx,
      });
      return {
        transaction: createdTransaction,
        trip: createdTrip,
        tags: createdTags,
        prototypes: createdPrototypes,
      };
    }
  );
  res.json(result);
}

export default authenticatedApiRoute("POST", handle);
