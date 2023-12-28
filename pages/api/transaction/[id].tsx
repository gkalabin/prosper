import { authenticatedApiRoute } from "lib/authenticatedApiRoute";
import { DB } from "lib/db";
import { TransactionWithExtensions } from "lib/model/AllDatabaseDataModel";
import prisma from "lib/prisma";
import {
  AddTransactionFormValues,
  FormMode,
  includeExtensions,
  TransactionAPIRequest,
  TransactionAPIResponse,
  transactionDbInput,
  writeExtension,
  writeTags,
  writeTrip,
} from "lib/transactionDbUtils";
import type { NextApiRequest, NextApiResponse } from "next";

async function handle(
  userId: number,
  req: NextApiRequest,
  res: NextApiResponse
) {
  const transactionId = parseInt(req.query.id as string);
  const { form } = req.body as TransactionAPIRequest;
  const db = new DB({ userId });
  const existing = await db.transactionFindFirst(
    Object.assign({ where: { id: transactionId } }, includeExtensions)
  );
  if (!existing) {
    res.status(404).send(`Transaction not found`);
    return;
  }
  const result: TransactionAPIResponse = await prisma.$transaction(
    async (tx) => {
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
        ...includeExtensions,
        data,
        where: { id: transactionId },
      });
      return {
        transaction: updatedTransaction,
        trip: createdTrip,
        tags: createdTags,
        prototypes: [],
      };
    }
  );

  res.json(result);
}

async function deleteExistingTransaction(
  tx,
  existing: TransactionWithExtensions
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
