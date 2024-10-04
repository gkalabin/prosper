import {
  CommonCreateAndUpdateInput,
  connectTags,
  deleteAllLinks,
  includeTagIds,
  toCents,
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
  const data = makeDbInput(income, userId);
  await prisma.$transaction(async tx => {
    await connectTags(tx, dbUpdates, data, income.tagNames, userId);
    if (transaction) {
      await update(tx, dbUpdates, transaction, data, income);
    } else {
      await create(tx, dbUpdates, data, income, protos, userId);
    }
  });
}

async function create(
  tx: Prisma.TransactionClient,
  dbUpdates: DatabaseUpdates,
  data: CommonCreateAndUpdateInput,
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
  data: CommonCreateAndUpdateInput,
  income: IncomeFormSchema
) {
  const updated = await tx.transaction.update({
    ...includeTagIds(),
    data: {
      ...data,
      // TODO: deprecate and remove this column.
      transactionToBeRepayedId: {set: income.parentTransactionId ?? null},
    },
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

function makeDbInput(
  income: IncomeFormSchema,
  userId: number
): Prisma.TransactionUncheckedCreateInput {
  const result: Prisma.TransactionUncheckedCreateInput = {
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
    // TODO: deprecate and remove this column.
    amountCents: toCents(income.amount),
    outgoingAccountId: null,
    outgoingAmountCents: null,
    vendor: null,
    tripId: null,
    payerOutgoingAmountCents: null,
    currencyCode: null,
    userId,
  };
  return result;
}
