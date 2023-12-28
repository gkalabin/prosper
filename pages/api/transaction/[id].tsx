import { authenticatedApiRoute } from "lib/authenticatedApiRoute";
import { DB } from "lib/db";
import { TransactionWithExtensions } from "lib/model/AllDatabaseDataModel";
import prisma from "lib/prisma";
import {
  addExtensionAndTrip,
  AddTransactionFormValues,
  FormMode,
  includeExtensions,
  transactionDbInput
} from "lib/transactionCreation";
import type { NextApiRequest, NextApiResponse } from "next";

async function handle(
  userId: number,
  req: NextApiRequest,
  res: NextApiResponse
) {
  const transactionId = parseInt(req.query.id as string);
  const form = req.body as AddTransactionFormValues;
  const db = new DB({ userId });
  const existing = await db.transactionFindFirst(
    Object.assign({ where: { id: transactionId } }, includeExtensions)
  );
  if (!existing) {
    res.status(404).send(`Transaction not found`);
    return;
  }
  const result = await prisma.$transaction(async (tx) => {
    if (!sameExtension(existing, form)) {
      deleteExistingTransaction(tx, userId, existing);
    }
    let data = transactionDbInput(form, userId);
    data = await addExtensionAndTrip({
      tx,
      data,
      form,
      userId,
      operation: "update",
    });
    return await tx.transaction.update(
      Object.assign(
        {
          data: data,
          where: { id: transactionId, userId },
        },
        includeExtensions
      )
    );
  });

  res.json(result);
}

function deleteExistingTransaction(
  tx,
  userId: number,
  existing: TransactionWithExtensions
) {
  const whereTransactionUser = {
    where: { transactionId: existing.id, userId },
  };
  if (existing.personalExpense) {
    tx.personalExpense.delete(whereTransactionUser);
  }
  if (existing.thirdPartyExpense) {
    tx.thirdPartyExpense.delete(whereTransactionUser);
  }
  if (existing.transfer) {
    tx.transfer.delete(whereTransactionUser);
  }
  if (existing.income) {
    tx.income.delete(whereTransactionUser);
  }
}

function sameExtension(
  oldData: TransactionWithExtensions,
  form: AddTransactionFormValues
) {
  return (
    (oldData.personalExpense && form.mode == FormMode.PERSONAL) ||
    (oldData.thirdPartyExpense && form.mode == FormMode.EXTERNAL) ||
    (oldData.income && form.mode == FormMode.INCOME) ||
    (oldData.transfer && form.mode == FormMode.TRANSFER)
  );
}

export default authenticatedApiRoute("POST", handle);
