import {
  connectTags,
  getOrCreateTrip,
  toCents,
  writeUsedProtos,
} from '@/actions/txform/shared';
import {ExpenseFormSchema} from '@/components/txform/v2/expense/types';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {assert, assertDefined} from '@/lib/assert';
import prisma from '@/lib/prisma';
import {type TransactionPrototype} from '@/lib/txsuggestions/TransactionPrototype';
import {Prisma, Transaction} from '@prisma/client';

export async function upsertExpense(
  transaction: Transaction | null,
  protos: TransactionPrototype[],
  userId: number,
  form: TransactionFormSchema
) {
  const expense = form.expense;
  assertDefined(expense);
  const data = makeDbInput(expense, userId);
  await prisma.$transaction(async tx => {
    const trip = await getOrCreateTrip({
      tx,
      tripName: expense.tripName,
      userId,
    });
    data.tripId = trip?.id;
    await connectTags(tx, data, expense.tagNames, userId);
    if (transaction) {
      await update(tx, transaction, data, expense, userId);
    } else {
      await create(tx, data, expense, protos, userId);
    }
  });
}

async function create(
  tx: Prisma.TransactionClient,
  data: Prisma.TransactionUncheckedCreateInput &
    Prisma.TransactionUncheckedUpdateInput,
  expense: ExpenseFormSchema,
  protos: TransactionPrototype[],
  userId: number
) {
  const transaction = await tx.transaction.create({data});
  await writeUsedProtos({
    protos,
    transactionId: transaction.id,
    userId,
    tx,
  });
  await maybeCreateRepaymentTransaction(tx, expense, transaction.id, userId);
}

async function update(
  tx: Prisma.TransactionClient,
  transaction: Transaction,
  data: Prisma.TransactionUncheckedCreateInput &
    Prisma.TransactionUncheckedUpdateInput,
  expense: ExpenseFormSchema,
  userId: number
) {
  await tx.transaction.update({
    data: {
      ...data,
      // TODO: deprecate and remove this column.
      transactionToBeRepayedId: {set: null},
    },
    where: {id: transaction.id},
  });
  const links = await tx.transactionLink.findMany({
    where: {
      OR: [
        {sourceTransactionId: transaction.id},
        {linkedTransactionId: transaction.id},
      ],
    },
  });
  const repayment = links.find(
    l =>
      l.linkType == 'DEBT_SETTLING' && l.sourceTransactionId == transaction.id
  );
  if (repayment && expense.sharingType == 'PAID_OTHER_REPAID') {
    // There is a repayment transaction and it is staying, update it.
    const repaymentData = makeRepaymentDbData(expense, userId);
    await tx.transaction.update({
      data: repaymentData,
      where: {
        id: repayment.linkedTransactionId,
      },
    });
  } else if (!repayment && expense.sharingType == 'PAID_OTHER_REPAID') {
    // No repayment exists and we need one, create it.
    await maybeCreateRepaymentTransaction(tx, expense, transaction.id, userId);
  } else if (repayment) {
    // There is a repayment and we don't need one, remove the link and the linked transaction.
    assert(expense.sharingType != 'PAID_OTHER_REPAID');
    await tx.transactionLink.delete({where: {id: repayment.id}});
    await tx.transaction.delete({
      where: {
        id: repayment.linkedTransactionId,
      },
    });
  } else {
    // No repayment and we don't need one, do nothing.
    assert(!repayment);
    assert(expense.sharingType != 'PAID_OTHER_REPAID');
  }
  const allLinkIds = links
    // Do not touch the repayment link as it was handled above.
    .filter(l => l.id != repayment?.id)
    .map(({id}) => id);
  // Remove all links except the one we've handled before.
  await tx.transactionLink.deleteMany({where: {id: {in: allLinkIds}}});
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
  const data = makeRepaymentDbData(expense, userId);
  const repaymentTx = await tx.transaction.create({data});
  const linkData: Prisma.TransactionLinkUncheckedCreateInput = {
    sourceTransactionId: transactionId,
    linkedTransactionId: repaymentTx.id,
    linkType: 'DEBT_SETTLING',
  };
  await tx.transactionLink.create({data: linkData});
  return repaymentTx;
}

function makeDbInput(
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

function makeRepaymentDbData(
  expense: ExpenseFormSchema,
  userId: number
): Prisma.TransactionUncheckedCreateInput &
  Prisma.TransactionUncheckedUpdateInput {
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
  return data;
}
