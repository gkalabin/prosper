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
import {assert, assertDefined} from '@/lib/assert';
import prisma from '@/lib/prisma';
import {type TransactionPrototype} from '@/lib/txsuggestions/TransactionPrototype';
import {Prisma, Transaction} from '@prisma/client';

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
    await maybeCreateRepaymentTransaction(tx, expense, transaction.id, userId);
  });
}

async function maybeCreateRepaymentTransaction(
  tx: Prisma.TransactionClient,
  expense: ExpenseFormSchema,
  transactionId: number,
  userId: number
): Promise<Transaction | null> {
  if (expense.sharingType != 'PAID_OTHER_REPAID') {
    return null;
  }
  const repayment = expense.repayment;
  assertDefined(repayment);
  const data: Prisma.TransactionUncheckedCreateInput = {
    transactionType: 'PERSONAL_EXPENSE' as const,
    timestamp: repayment.timestamp,
    categoryId: repayment.categoryId,
    outgoingAccountId: repayment.accountId,
    outgoingAmountCents: toCents(expense.ownShareAmount),
    ownShareAmountCents: toCents(expense.ownShareAmount),
    vendor: expense.payer,
    description: 'Paid back for ' + expense.vendor,
    // TODO: remove.
    amountCents: toCents(expense.ownShareAmount),
    userId,
  };
  const repaymentTx = await tx.transaction.create({data});
  const linkData: Prisma.TransactionLinksUncheckedCreateInput = {
    sourceTransactionId: transactionId,
    linkedTransactionId: repaymentTx.id,
    linkType: 'REPAYMENT',
  };
  await tx.transactionLinks.create({data: linkData});
  return repaymentTx;
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
  assert(
    sharingType == 'PAID_OTHER_OWED' || sharingType == 'PAID_OTHER_REPAID'
  );
  const result: Prisma.TransactionUncheckedCreateInput = {
    transactionType: 'THIRD_PARTY_EXPENSE' as const,
    timestamp: expense.timestamp,
    description: expense.description ?? '',
    payerOutgoingAmountCents: toCents(expense.amount),
    ownShareAmountCents: toCents(expense.ownShareAmount),
    amountCents: toCents(expense.amount),
    categoryId: expense.categoryId,
    vendor: expense.vendor,
    payer: expense.payer,
    tripId: null,
    outgoingAccountId: null,
    outgoingAmountCents: null,
    incomingAccountId: null,
    incomingAmountCents: null,
    currencyCode: expense.currency,
    otherPartyName: expense.companion,
    userId,
  };
  return result;
}
