'use server';
import {
  ExpenseFormSchema,
  TransactionFormSchema,
  transactionFormValidationSchema,
} from '@/components/txform/v2/types';
import {assertDefined} from '@/lib/assert';
import {Tag} from '@/lib/model/Tag';
import prisma from '@/lib/prisma';
import {
  type TransactionPrototype,
  TransactionPrototypeList,
  transactionPrototypeListSchema,
  WithdrawalOrDepositPrototype,
} from '@/lib/txsuggestions/TransactionPrototype';
import {getUserId} from '@/lib/user';
import {Prisma, Trip} from '@prisma/client';

export async function upsertTransaction(
  unsafeProtos: TransactionPrototypeList,
  unsafeData: TransactionFormSchema
) {
  const userId = await getUserId();
  const validatedData = transactionFormValidationSchema.safeParse(unsafeData);
  if (!validatedData.success) {
    return {
      errors: validatedData.error.flatten().fieldErrors,
    };
  }
  const data = validatedData.data;
  const validatedProtos =
    transactionPrototypeListSchema.safeParse(unsafeProtos);
  if (!validatedProtos.success) {
    const fieldErrors = validatedProtos.error.flatten().fieldErrors;
    return {
      // Without Object.fromEntries, fieldErrors is not serializable as it contains [entries] and [iterator] properties.
      errors: Object.fromEntries(
        Object.entries(fieldErrors).map(([key, value]) => [
          key,
          Array.isArray(value) ? [...value] : value,
        ])
      ),
    };
  }
  if (data.expense) {
    await createExpense(validatedProtos.data, userId, data);
  }
  return {};
}

async function createExpense(
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
  const shareType = expense.shareType;
  const paidSelf =
    shareType == 'PAID_SELF_SHARED' || shareType == 'PAID_SELF_NOT_SHARED';
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

    switch (shareType) {
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
        const _exhaustiveCheck: never = shareType;
        throw new Error(`Unexpected share type: ${_exhaustiveCheck}`);
    }
  }
  throw new Error('Not implemented');
}

async function getOrCreateTrip({
  tx,
  tripName,
  userId,
}: {
  tx: Prisma.TransactionClient;
  tripName: string | null;
  userId: number;
}): Promise<Trip | null> {
  if (!tripName) {
    return null;
  }
  const tripNameAndUser = {name: tripName, userId};
  const existing = await tx.trip.findFirst({where: tripNameAndUser});
  if (existing) {
    return existing;
  }
  return await tx.trip.create({data: tripNameAndUser});
}

async function getOrCreateTags(
  tx: Prisma.TransactionClient,
  tagNames: string[],
  userId: number
): Promise<Tag[]> {
  if (!tagNames.length) {
    return [];
  }
  const existing: Tag[] = await tx.tag.findMany({
    where: {
      userId,
      name: {
        in: tagNames,
      },
    },
  });
  const newNames = tagNames.filter(x => existing.every(t => t.name != x));
  const created = await Promise.all(
    newNames.map(name => tx.tag.create({data: {name, userId}}))
  );
  return [...existing, ...created];
}

async function writeUsedProtos({
  protos,
  transactionId,
  userId,
  tx,
}: {
  protos: TransactionPrototype[];
  transactionId: number;
  userId: number;
  tx: Prisma.TransactionClient;
}): Promise<void> {
  if (!protos.length) {
    return;
  }
  // Transfer protos consist of two parts: deposit and withdrawal.
  // Replace all the transfers in the input with their parts to simplify the insert.
  const plainProtos: WithdrawalOrDepositPrototype[] = protos.flatMap(proto =>
    proto.type == 'transfer' ? [proto.deposit, proto.withdrawal] : [proto]
  );
  await tx.transactionPrototype.createMany({
    data: plainProtos.map(
      (proto): Prisma.TransactionPrototypeCreateManyInput => ({
        internalTransactionId: transactionId,
        externalDescription: proto.originalDescription,
        externalId: proto.externalTransactionId,
        userId,
      })
    ),
  });
}

// TODO: move to util and write tests.
const toCents = (x: number): number => Math.round(x * 100);
