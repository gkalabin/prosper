import {connectTags, toCents, writeUsedProtos} from '@/actions/txform/shared';
import {IncomeFormSchema} from '@/components/txform/v2/income/validation';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {assertDefined} from '@/lib/assert';
import prisma from '@/lib/prisma';
import {type TransactionPrototype} from '@/lib/txsuggestions/TransactionPrototype';
import {Prisma, Transaction} from '@prisma/client';

export async function upsertIncome(
  transaction: Transaction | null,
  protos: TransactionPrototype[],
  userId: number,
  form: TransactionFormSchema
) {
  const income = form.income;
  assertDefined(income);
  const data = makeDbInput(income, userId);
  await prisma.$transaction(async tx => {
    await connectTags(tx, data, income.tagNames, userId);
    if (transaction) {
      await update(tx, transaction, data, income);
    } else {
      await create(tx, data, income, protos, userId);
    }
  });
}

async function create(
  tx: Prisma.TransactionClient,
  data: Prisma.TransactionUncheckedCreateInput &
    Prisma.TransactionUncheckedUpdateInput,
  income: IncomeFormSchema,
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
  await writeLinks(tx, income, transaction.id);
}

async function update(
  tx: Prisma.TransactionClient,
  transaction: Transaction,
  data: Prisma.TransactionUncheckedCreateInput &
    Prisma.TransactionUncheckedUpdateInput,
  income: IncomeFormSchema
) {
  await tx.transaction.update({
    data: {
      ...data,
      // TODO: deprecate and remove this column.
      transactionToBeRepayedId: {set: income.parentTransactionId ?? null},
    },
    where: {id: transaction.id},
  });
  // Remove all links, then re-add the one we want.
  // Alternative is to query the links and update conditionally,
  // but this is only useful for performance which is not a problem yet.
  await tx.transactionLink.deleteMany({
    where: {
      OR: [
        {sourceTransactionId: transaction.id},
        {linkedTransactionId: transaction.id},
      ],
    },
  });
  await writeLinks(tx, income, transaction.id);
}

async function writeLinks(
  tx: Prisma.TransactionClient,
  income: IncomeFormSchema,
  transactionId: number
) {
  if (!income.parentTransactionId) {
    return;
  }
  await tx.transactionLink.create({
    data: {
      sourceTransactionId: income.parentTransactionId,
      linkedTransactionId: transactionId,
      linkType: 'REFUND' as const,
    },
  });
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
