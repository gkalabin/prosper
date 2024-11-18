import {
  connectTags,
  CreateInput,
  deleteAllLinks,
  includeTagIds,
  UpdateInput,
  updateTags,
  writeUsedProtos,
} from '@/actions/txform/shared';
import {DatabaseUpdates} from '@/actions/txform/types';
import {TransferFormSchema} from '@/components/txform/transfer/types';
import {TransactionFormSchema} from '@/components/txform/types';
import {assertDefined} from '@/lib/assert';
import prisma from '@/lib/prisma';
import {type TransactionPrototype} from '@/lib/txsuggestions/TransactionPrototype';
import {dollarToCents} from '@/lib/util/util';
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
  const common = makeDbInput(transfer, userId);
  await prisma.$transaction(async tx => {
    if (transaction) {
      const data: UpdateInput = common;
      await updateTags(tx, dbUpdates, data, transfer.tagNames, userId);
      await update(tx, dbUpdates, transaction, data);
    } else {
      const data: CreateInput = common;
      await connectTags(tx, dbUpdates, data, transfer.tagNames, userId);
      await create(tx, dbUpdates, data, protos, userId);
    }
  });
}

async function create(
  tx: Prisma.TransactionClient,
  dbUpdates: DatabaseUpdates,
  data: CreateInput,
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
  data: UpdateInput
) {
  const updated = await tx.transaction.update({
    ...includeTagIds(),
    data,
    where: {id: transaction.id},
  });
  dbUpdates.transactions[transaction.id] = updated;
  // Transfers cannot have any links, so just remove all the links.
  await deleteAllLinks(tx, dbUpdates, transaction.id);
}

function makeDbInput(transfer: TransferFormSchema, userId: number) {
  return {
    transactionType: 'TRANSFER' as const,
    timestamp: transfer.timestamp,
    description: transfer.description ?? '',
    outgoingAccountId: transfer.fromAccountId,
    outgoingAmountCents: dollarToCents(transfer.amountSent),
    incomingAccountId: transfer.toAccountId,
    incomingAmountCents: dollarToCents(transfer.amountReceived),
    categoryId: transfer.categoryId,
    vendor: null,
    payer: null,
    tripId: null,
    payerOutgoingAmountCents: null,
    currencyCode: null,
    userId,
  };
}
