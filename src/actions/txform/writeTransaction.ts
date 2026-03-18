import {nextIid} from '@/actions/txform/shared';
import {writeExpense} from '@/actions/txform/writeExpense';
import {writeIncome} from '@/actions/txform/writeIncome';
import {writeTransfer} from '@/actions/txform/writeTransfer';
import {TransactionFormSchema} from '@/components/txform/types';
import prisma from '@/lib/prisma';
import {type TransactionPrototype} from '@/lib/txsuggestions/TransactionPrototype';
import {Prisma} from '@prisma/client';

export async function writeTransactionV2({
  userId,
  form,
  protos,
  transactionIdToSupersede,
}: {
  userId: number;
  form: TransactionFormSchema;
  protos: TransactionPrototype[];
  transactionIdToSupersede: number | null;
}): Promise<void> {
  await prisma.$transaction(async tx => {
    const ledgerAccounts = await tx.ledgerAccountV2.findMany({
      where: {userId},
    });
    const {iid, supersedesId} = await resolveIidAndSupersedes(
      tx,
      userId,
      transactionIdToSupersede
    );
    if (form.expense) {
      await writeExpense(tx, {
        userId,
        iid,
        supersedesId,
        expense: form.expense,
        ledgerAccounts,
        protos,
        transactionIdToSupersede,
      });
      return;
    }
    if (form.income) {
      await writeIncome(tx, {
        userId,
        iid,
        supersedesId,
        income: form.income,
        ledgerAccounts,
        protos,
        transactionIdToSupersede,
      });
      return;
    }
    if (form.transfer) {
      await writeTransfer(tx, {
        userId,
        iid,
        supersedesId,
        transfer: form.transfer,
        ledgerAccounts,
        protos,
        transactionIdToSupersede,
      });
      return;
    }
    throw new Error('No form data provided');
  });
}

async function resolveIidAndSupersedes(
  tx: Prisma.TransactionClient,
  userId: number,
  transactionIdToSupersede: number | null
): Promise<{iid: number; supersedesId: number | null}> {
  if (!transactionIdToSupersede) {
    return {iid: await nextIid(tx, userId), supersedesId: null};
  }
  // Editing: look up the current version to supersede.
  const current = await tx.transactionV2.findUnique({
    where: {id: transactionIdToSupersede, userId},
  });
  if (!current) {
    throw new Error(
      `Transaction ${transactionIdToSupersede} not found for user ${userId}`
    );
  }
  return {iid: current.iid, supersedesId: current.id};
}
