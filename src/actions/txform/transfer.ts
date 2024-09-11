import {
  getOrCreateTags,
  toCents,
  writeUsedProtos,
} from '@/actions/txform/shared';
import {
  TransactionFormSchema,
  TransferFormSchema,
} from '@/components/txform/v2/types';
import {assertDefined} from '@/lib/assert';
import prisma from '@/lib/prisma';
import {type TransactionPrototype} from '@/lib/txsuggestions/TransactionPrototype';
import {Prisma} from '@prisma/client';

export async function createTransfer(
  protos: TransactionPrototype[],
  userId: number,
  form: TransactionFormSchema
) {
  const transfer = form.transfer;
  assertDefined(transfer);
  await prisma.$transaction(async tx => {
    const data = createTransactionInput(transfer, userId);
    const tags = await getOrCreateTags(tx, transfer.tagNames, userId);
    if (tags.length) {
      data.tags = {connect: tags.map(({id}) => ({id}))};
    }
    const transaction = await tx.transaction.create({data});
    await writeUsedProtos({
      protos,
      transactionId: transaction.id,
      userId,
      tx,
    });
  });
}

function createTransactionInput(
  transfer: TransferFormSchema,
  userId: number
): Prisma.TransactionUncheckedCreateInput {
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
