import {
  CommonCreateAndUpdateInput,
  connectTags,
  deleteAllLinks,
  includeTagIds,
  toCents,
  writeUsedProtos,
} from '@/actions/txform/shared';
import {DatabaseUpdates} from '@/actions/txform/types';
import {TransferFormSchema} from '@/components/txform/v2/transfer/types';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {assertDefined} from '@/lib/assert';
import prisma from '@/lib/prisma';
import {type TransactionPrototype} from '@/lib/txsuggestions/TransactionPrototype';
import {Prisma, Transaction} from '@prisma/client';

export async function upsertTransfer(
  dbUpdates: DatabaseUpdates,
  transaction: Transaction | null,
  protos: TransactionPrototype[],
  userId: number,
  form: TransactionFormSchema
): Promise<void> {
  const transfer = form.transfer;
  assertDefined(transfer);
  const data = makeDbInput(transfer, userId);
  await prisma.$transaction(async tx => {
    await connectTags(tx, dbUpdates, data, transfer.tagNames, userId);
    if (transaction) {
      await update(tx, dbUpdates, transaction, data);
    } else {
      await create(tx, dbUpdates, data, protos, userId);
    }
  });
}

async function create(
  tx: Prisma.TransactionClient,
  dbUpdates: DatabaseUpdates,
  data: CommonCreateAndUpdateInput,
  protos: TransactionPrototype[],
  userId: number
) {
  const transaction = await tx.transaction.create({...includeTagIds(), data});
  dbUpdates.transactions[transaction.id] = transaction;
  await writeUsedProtos({
    tx,
    dbUpdates,
    protos,
    transactionId: transaction.id,
    userId,
  });
}

async function update(
  tx: Prisma.TransactionClient,
  dbUpdates: DatabaseUpdates,
  transaction: Transaction,
  data: CommonCreateAndUpdateInput
) {
  const updated = await tx.transaction.update({
    ...includeTagIds(),
    data: {
      ...data,
      // TODO: deprecate and remove this column.
      transactionToBeRepayedId: {set: null},
    },
    where: {id: transaction.id},
  });
  dbUpdates.transactions[transaction.id] = updated;
  // Transfers cannot have any links, so just remove all the links.
  await deleteAllLinks(tx, dbUpdates, transaction.id);
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
