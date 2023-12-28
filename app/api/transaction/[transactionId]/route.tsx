import { Prisma, Tag } from "@prisma/client";
import { DB } from "lib/db";
import prisma from "lib/prisma";
import {
  AddTransactionFormValues,
  TransactionAPIRequest,
  TransactionAPIResponse,
  commonTransactionDbData,
  fetchOrCreateTags,
  includeTagIds,
  writeTrip,
} from "lib/transactionDbUtils";
import { getUserId } from "lib/user";
import { intParam } from "lib/util/searchParams";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { transactionId: string } },
): Promise<Response> {
  const transactionId = intParam(params.transactionId);
  if (!transactionId) {
    return new Response(`transactionId must be an integer`, { status: 400 });
  }
  const { form } = (await request.json()) as TransactionAPIRequest;
  const userId = await getUserId();
  const db = new DB({ userId });
  const existing = await db.transactionById(transactionId);
  if (!existing) {
    return new Response(`Not authenticated`, { status: 401 });
  }
  const result: TransactionAPIResponse = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const data = updateTransactionData(form, userId);
      const createdTrip = await writeTrip({ tx, data, form, userId });
      const { createdTags } = await writeTags({ tx, data, form, userId });
      const updatedTransaction = await tx.transaction.update({
        ...includeTagIds,
        data,
        where: { id: transactionId },
      });
      return {
        transaction: updatedTransaction,
        trip: createdTrip,
        tags: createdTags,
        prototypes: [],
      };
    },
  );

  return NextResponse.json(result);
}

export function updateTransactionData(
  form: AddTransactionFormValues,
  userId: number,
): Prisma.TransactionUncheckedUpdateInput {
  const data: Prisma.TransactionUncheckedUpdateInput = commonTransactionDbData(
    form,
    userId,
  );
  if (!form.parentTransactionId) {
    data.transactionToBeRepayedId = { set: null };
  }
  return data;
}

async function writeTags({
  form,
  userId,
  data,
  tx,
}: {
  form: AddTransactionFormValues;
  userId: number;
  data: Prisma.TransactionUncheckedUpdateInput;
  tx: Prisma.TransactionClient;
}): Promise<{ createdTags: Tag[] }> {
  const tags = await fetchOrCreateTags(tx, form.tagNames, userId);
  const allTags = [...tags.existing, ...tags.created];
  data.tags = { set: allTags.map(({ id }) => ({ id })) };
  return { createdTags: tags.created };
}
