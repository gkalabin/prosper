import {
  getOrCreateTags,
  toCents,
  writeUsedProtos,
} from '@/actions/txform/shared';
import {IncomeFormSchema} from '@/components/txform/v2/income/validation';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {assertDefined} from '@/lib/assert';
import prisma from '@/lib/prisma';
import {type TransactionPrototype} from '@/lib/txsuggestions/TransactionPrototype';
import {Prisma} from '@prisma/client';

export async function createIncome(
  protos: TransactionPrototype[],
  userId: number,
  form: TransactionFormSchema
) {
  const income = form.income;
  assertDefined(income);
  await prisma.$transaction(async tx => {
    const data = createTransactionInput(income, userId);
    const tags = await getOrCreateTags(tx, income.tagNames, userId);
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
    await writeLinks(tx, income, transaction.id);
  });
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

function createTransactionInput(
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
