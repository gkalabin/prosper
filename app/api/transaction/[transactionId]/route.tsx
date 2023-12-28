import { Prisma } from "@prisma/client";
import { DB } from "lib/db";
import { TransactionWithExtensions } from "lib/model/AllDatabaseDataModel";
import prisma from "lib/prisma";
import {
  AddTransactionFormValues,
  FormMode,
  TransactionAPIRequest,
  TransactionAPIResponse,
  includeExtensionsAndTags,
  transactionDbInput,
  writeExtension,
  writeTags,
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
      const sameExtension = isSameExtension(existing, form);
      if (!sameExtension) {
        await deleteExistingTransaction(tx, existing);
      }
      const data = transactionDbInput(form, userId);
      writeExtension({
        data,
        form,
        userId,
        operation: sameExtension ? "update" : "create",
      });
      const createdTrip = await writeTrip({ tx, data, form, userId });
      const { createdTags } = await writeTags({ tx, data, form, userId });
      const updatedTransaction = await tx.transaction.update({
        ...includeExtensionsAndTags,
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

async function deleteExistingTransaction(
  tx: Prisma.TransactionClient,
  existing: TransactionWithExtensions,
) {
  const whereTransaction = {
    where: { transactionId: existing.id },
  };
  if (existing.personalExpense) {
    await tx.personalExpense.delete(whereTransaction);
  }
  if (existing.thirdPartyExpense) {
    await tx.thirdPartyExpense.delete(whereTransaction);
  }
  if (existing.transfer) {
    await tx.transfer.delete(whereTransaction);
  }
  if (existing.income) {
    await tx.income.delete(whereTransaction);
  }
}

function isSameExtension(
  oldData: TransactionWithExtensions,
  form: AddTransactionFormValues,
) {
  return (
    (oldData.personalExpense && form.mode == FormMode.PERSONAL) ||
    (oldData.thirdPartyExpense && form.mode == FormMode.EXTERNAL) ||
    (oldData.income && form.mode == FormMode.INCOME) ||
    (oldData.transfer && form.mode == FormMode.TRANSFER)
  );
}
