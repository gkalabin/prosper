import { authenticatedApiRoute } from "lib/authenticatedApiRoute";
import prisma from "lib/prisma";
import {
  includeExtensions,
  TransactionAPIRequest,
  TransactionAPIResponse,
  transactionDbInput,
  writeExtension,
  writeTags,
  writeTrip,
  writeUsedOpenBankingTransactions,
} from "lib/transactionCreation";
import type { NextApiRequest, NextApiResponse } from "next";

async function handle(
  userId: number,
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { form, usedOpenBankingTransactions, suggestedVendor } =
    req.body as TransactionAPIRequest;
  const result: TransactionAPIResponse = await prisma.$transaction(
    async (tx) => {
      const data = transactionDbInput(form, userId);
      writeExtension({ data, form, userId, operation: "create" });
      const { createdTrip } = await writeTrip({ tx, data, form, userId });
      const { createdTags } = await writeTags({ tx, data, form, userId });
      const createdTransaction = await tx.transaction.create(
        Object.assign({ data }, includeExtensions)
      );
      const { createdOpenBankingTransactions } =
        await writeUsedOpenBankingTransactions({
          usedOpenBankingTransactions,
          suggestedVendor,
          createdTransactionId: createdTransaction.id,
          userId,
          tx,
        });
      return {
        transaction: createdTransaction,
        trip: createdTrip,
        tags: createdTags,
        openBankingTransactions: createdOpenBankingTransactions,
      };
    }
  );
  res.json(result);
}

export default authenticatedApiRoute("POST", handle);
