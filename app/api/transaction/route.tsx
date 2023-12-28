import { Prisma, Tag } from "@prisma/client";
import prisma from "lib/prisma";
import {
  AddTransactionFormValues,
  TransactionAPIRequest,
  TransactionAPIResponse,
  commonTransactionDbData,
  fetchOrCreateTags,
  includeTagIds,
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
      const data = createTransactionData(form, userId);
      const createdTrip = await writeTrip({ tx, data, form, userId });
      const { createdTags } = await writeTags({ tx, data, form, userId });
      const createdTransaction = await tx.transaction.create({
        data,
        ...includeTagIds,
      });
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

async function writeTags({
  form,
  userId,
  data,
  tx,
}: {
  form: AddTransactionFormValues;
  userId: number;
  data: Prisma.TransactionUncheckedCreateInput;
  tx: Prisma.TransactionClient;
}): Promise<{ createdTags: Tag[] }> {
  const tags = await fetchOrCreateTags(tx, form.tagNames, userId);
  const allTags = [...tags.existing, ...tags.created];
  data.tags = { connect: allTags.map(({ id }) => ({ id })) };
  return { createdTags: tags.created };
}

function createTransactionData(
  form: AddTransactionFormValues,
  userId: number,
): Prisma.TransactionUncheckedCreateInput {
  return commonTransactionDbData(form, userId);
}
