import {
  connectTags,
  CreateInput,
  deleteAllLinks,
  includeTagIds,
  toCents,
  UpdateInput,
  updateTags,
  writeUsedProtos,
} from '@/actions/txform/shared';
import {DatabaseUpdates} from '@/actions/txform/types';
import {IncomeFormSchema} from '@/components/txform/income/types';
import {TransactionFormSchema} from '@/components/txform/types';
import {assertDefined} from '@/lib/assert';
import prisma from '@/lib/prisma';
import {type TransactionPrototype} from '@/lib/txsuggestions/TransactionPrototype';
import {Prisma, Transaction} from '@prisma/client';

export async function upsertIncome(
  dbUpdates: DatabaseUpdates,
  transaction: Transaction | null,
  protos: TransactionPrototype[],
  userId: number,
  form: TransactionFormSchema
) {
  const income = form.income;
  assertDefined(income);
  const common = makeDbInput(income, userId);
  await prisma.$transaction(async tx => {
    if (transaction) {
      const data: UpdateInput = common;
      await updateTags(tx, dbUpdates, data, income.tagNames, userId);
      await update(tx, dbUpdates, transaction, data, income);
    } else {
      const data: CreateInput = common;
      await connectTags(tx, dbUpdates, data, income.tagNames, userId);
      await create(tx, dbUpdates, data, income, protos, userId);
    }
  });
}

async function create(
  tx: Prisma.TransactionClient,
  dbUpdates: DatabaseUpdates,
  data: CreateInput,
  income: IncomeFormSchema,
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
  await writeLinks(tx, dbUpdates, income, transaction.id);
}

async function update(
  tx: Prisma.TransactionClient,
  dbUpdates: DatabaseUpdates,
  transaction: Transaction,
  data: UpdateInput,
  income: IncomeFormSchema
) {
  const updated = await tx.transaction.update({
    ...includeTagIds(),
    data,
    where: {id: transaction.id},
  });
  dbUpdates.transactions[updated.id] = updated;
  // Remove all links, then re-add the one we want.
  await deleteAllLinks(tx, dbUpdates, transaction.id);
  await writeLinks(tx, dbUpdates, income, transaction.id);
}

async function writeLinks(
  tx: Prisma.TransactionClient,
  dbUpdates: DatabaseUpdates,
  income: IncomeFormSchema,
  transactionId: number
) {
  if (!income.parentTransactionId) {
    return;
  }
  const newLink = await tx.transactionLink.create({
    data: {
      sourceTransactionId: income.parentTransactionId,
      linkedTransactionId: transactionId,
      linkType: 'REFUND' as const,
    },
  });
  dbUpdates.transactionLinks[newLink.id] = newLink;
}

function makeDbInput(income: IncomeFormSchema, userId: number) {
  return {
    transactionType: 'INCOME' as const,
    timestamp: income.timestamp,
    payer: income.payer,
    description: income.description ?? '',
    incomingAccountId: income.accountId,
    incomingAmountCents: toCents(income.amount),
    ownShareAmountCents: income.isShared
      ? toCents(income.ownShareAmount)
      : toCents(income.amount),
    otherPartyName: income.isShared ? income.companion : null,
    categoryId: income.categoryId,
    outgoingAccountId: null,
    outgoingAmountCents: null,
    vendor: null,
    tripId: null,
    payerOutgoingAmountCents: null,
    currencyCode: null,
    userId,
  };
}
