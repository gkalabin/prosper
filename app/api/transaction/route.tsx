import prisma from "lib/prisma";
import {
  TransactionAPIRequest,
  TransactionAPIResponse,
  includeExtensionsAndTags,
  transactionDbInput,
  writeExtension,
  writeTags,
  writeTrip,
  writeUsedPrototypes,
} from "lib/transactionDbUtils";
import { getUserId } from "lib/user";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest): Promise<Response> {
  const { form, usedPrototype } =
    (await request.json()) as TransactionAPIRequest;
  const userId = await getUserId();
  const result: TransactionAPIResponse = await prisma.$transaction(
    async (tx) => {
      const data = transactionDbInput(form, userId);
      writeExtension({ data, form, userId, operation: "create" });
      const createdTrip = await writeTrip({ tx, data, form, userId });
      const { createdTags } = await writeTags({ tx, data, form, userId });
      const createdTransaction = await tx.transaction.create(
        Object.assign({ data }, includeExtensionsAndTags),
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
    },
  );
  return NextResponse.json(result);
}
