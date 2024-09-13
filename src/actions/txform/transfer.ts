import {connectTags, toCents, writeUsedProtos} from '@/actions/txform/shared';
import {
  TransactionFormSchema,
  TransferFormSchema,
} from '@/components/txform/v2/types';
import {assertDefined} from '@/lib/assert';
import prisma from '@/lib/prisma';
import {type TransactionPrototype} from '@/lib/txsuggestions/TransactionPrototype';
import {Prisma, Transaction} from '@prisma/client';

export async function upsertTransfer(
  transaction: Transaction | null,
  protos: TransactionPrototype[],
  userId: number,
  form: TransactionFormSchema
) {
  const transfer = form.transfer;
  assertDefined(transfer);
  const data = makeDbInput(transfer, userId);
  await prisma.$transaction(async tx => {
    await connectTags(tx, data, transfer.tagNames, userId);
    if (transaction) {
      await update(tx, transaction, data);
    } else {
      await create(tx, data, protos, userId);
    }
  });
}

async function create(
  tx: Prisma.TransactionClient,
  data: Prisma.TransactionUncheckedCreateInput &
    Prisma.TransactionUncheckedUpdateInput,
  protos: TransactionPrototype[],
  userId: number
) {
  const transaction = await tx.transaction.create({data});
  await writeUsedProtos({
    tx,
    protos,
    transactionId: transaction.id,
    userId,
  });
}

async function update(
  tx: Prisma.TransactionClient,
  transaction: Transaction,
  data: Prisma.TransactionUncheckedCreateInput &
    Prisma.TransactionUncheckedUpdateInput
) {
  await tx.transaction.update({
    data: {
      ...data,
      // TODO: deprecate and remove this column.
      transactionToBeRepayedId: {set: null},
    },
    where: {id: transaction.id},
  });
  // Transfers cannot have any links, so just remove all the links.
  await tx.transactionLink.deleteMany({
    where: {
      OR: [
        {sourceTransactionId: transaction.id},
        {linkedTransactionId: transaction.id},
      ],
    },
  });
}

function makeDbInput(
  transfer: TransferFormSchema,
  userId: number
): Prisma.TransactionUncheckedCreateInput &
  Prisma.TransactionUncheckedUpdateInput {
  const result: Prisma.TransactionUncheckedCreateInput = {
    transactionType: 'TRANSFER' as const,
    timestamp: transfer.timestamp,
    description: transfer.description ?? '',
    outgoingAccountId: transfer.fromAccountId,
    outgoingAmountCents: toCents(transfer.amountSent),
    incomingAccountId: transfer.toAccountId,
    incomingAmountCents: toCents(transfer.amountReceived),
    categoryId: transfer.categoryId,
    // TODO: deprecate and remove this column.
    amountCents: toCents(transfer.amountSent),
    vendor: null,
    payer: null,
    tripId: null,
    payerOutgoingAmountCents: null,
    currencyCode: null,
    userId,
  };
  return result;
}
