import {
  getOrCreateTags,
  getOrCreateTrip,
  toCents,
  writeUsedProtos,
} from '@/actions/txform/shared';
import {
  ExpenseFormSchema,
  TransactionFormSchema,
} from '@/components/txform/v2/types';
import {assertDefined} from '@/lib/assert';
import prisma from '@/lib/prisma';
import {type TransactionPrototype} from '@/lib/txsuggestions/TransactionPrototype';
import {Prisma} from '@prisma/client';

export async function createExpense(
  protos: TransactionPrototype[],
  userId: number,
  form: TransactionFormSchema
) {
  const expense = form.expense;
  assertDefined(expense);
  await prisma.$transaction(async tx => {
    const data = createTransactionInput(expense, userId);
    const trip = await getOrCreateTrip({
      tx,
      tripName: expense.tripName,
      userId,
    });
    data.tripId = trip?.id;
    const tags = await getOrCreateTags(tx, expense.tagNames, userId);
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
  expense: ExpenseFormSchema,
  userId: number
): Prisma.TransactionUncheckedCreateInput {
  const {sharingType} = expense;
  const paidSelf =
    sharingType == 'PAID_SELF_SHARED' || sharingType == 'PAID_SELF_NOT_SHARED';
  if (paidSelf) {
    const partialResult = {
      transactionType: 'PERSONAL_EXPENSE' as const,
      timestamp: expense.timestamp,
      description: expense.description ?? '',
      amountCents: toCents(expense.amount),
      categoryId: expense.categoryId,
      vendor: expense.vendor,
      payer: null,
      tripId: null,
      outgoingAccountId: expense.accountId,
      outgoingAmountCents: toCents(expense.amount),
      incomingAccountId: null,
      incomingAmountCents: null,
      payerOutgoingAmountCents: null,
      currencyCode: null,
      userId,
    };

    switch (sharingType) {
      case 'PAID_SELF_NOT_SHARED':
        return {
          ...partialResult,
          otherPartyName: null,
          ownShareAmountCents: toCents(expense.amount),
        };

      case 'PAID_SELF_SHARED':
        return {
          ...partialResult,
          otherPartyName: expense.companion,
          ownShareAmountCents: toCents(expense.ownShareAmount ?? 0),
        };

      default:
        const _exhaustiveCheck: never = sharingType;
        throw new Error(`Unexpected share type: ${_exhaustiveCheck}`);
    }
  }
  throw new Error('Not implemented');
}
