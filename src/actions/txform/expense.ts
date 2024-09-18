import {
  CommonCreateAndUpdateInput,
  connectTags,
  getOrCreateTrip,
  includeTagIds,
  toCents,
  writeUsedProtos,
} from '@/actions/txform/shared';
import {DatabaseUpdates} from '@/actions/txform/types';
import {ExpenseFormSchema} from '@/components/txform/v2/expense/types';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {assert, assertDefined} from '@/lib/assert';
import prisma from '@/lib/prisma';
import {type TransactionPrototype} from '@/lib/txsuggestions/TransactionPrototype';
import {Prisma, Transaction} from '@prisma/client';

export async function upsertExpense(
  dbUpdates: DatabaseUpdates,
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
    dbUpdates.trip = trip;
    await connectTags(tx, dbUpdates, data, expense.tagNames, userId);
    if (transaction) {
      await update(tx, dbUpdates, transaction, data, expense, userId);
    } else {
      await create(tx, dbUpdates, data, expense, protos, userId);
    }
  });
}

async function create(
  tx: Prisma.TransactionClient,
  dbUpdates: DatabaseUpdates,
  data: CommonCreateAndUpdateInput,
  expense: ExpenseFormSchema,
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
  await maybeCreateRepaymentTransaction(
    tx,
    dbUpdates,
    expense,
    transaction.id,
    userId
  );
}

async function update(
  tx: Prisma.TransactionClient,
  dbUpdates: DatabaseUpdates,
  transaction: Transaction,
  data: CommonCreateAndUpdateInput,
  expense: ExpenseFormSchema,
  userId: number
) {
  const updated = await tx.transaction.update({
    ...includeTagIds(),
    data: {
      ...data,
      // TODO: deprecate and remove this column.
      transactionToBeRepayedId: {set: null},
    },
    where: {id: transaction.id},
  });
  dbUpdates.transactions[updated.id] = updated;
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
  // A simpler approach is to drop everything (links and transactions) and recreate them,
  // but this would make the ids of the repayment transaction change when modifying anything within,
  // so a more sophisticated approach is needed which looks into the current and the futuree state.
  if (repayment && expense.sharingType == 'PAID_OTHER_REPAID') {
    // There is a repayment transaction and it is staying, update it.
    const repaymentData = makeRepaymentDbData(expense, userId);
    const updatedRepayment = await tx.transaction.update({
      ...includeTagIds(),
      data: repaymentData,
      where: {
        id: repayment.linkedTransactionId,
      },
    });
    dbUpdates.transactions[updatedRepayment.id] = updatedRepayment;
  } else if (!repayment && expense.sharingType == 'PAID_OTHER_REPAID') {
    // No repayment exists and we need one, create it.
    await maybeCreateRepaymentTransaction(
      tx,
      dbUpdates,
      expense,
      transaction.id,
      userId
    );
  } else if (repayment) {
    // There is a repayment and we don't need one, remove the link and the linked transaction.
    assert(expense.sharingType != 'PAID_OTHER_REPAID');
    await tx.transactionLink.delete({where: {id: repayment.id}});
    dbUpdates.transactionLinks[repayment.id] = null;
    await tx.transaction.delete({
      where: {
        id: repayment.linkedTransactionId,
      },
    });
    dbUpdates.transactions[repayment.linkedTransactionId] = null;
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
  allLinkIds.forEach(id => {
    dbUpdates.transactionLinks[id] = null;
  });
}

async function maybeCreateRepaymentTransaction(
  tx: Prisma.TransactionClient,
  dbUpdates: DatabaseUpdates,
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
  const repaymentTx = await tx.transaction.create({...includeTagIds(), data});
  dbUpdates.transactions[repaymentTx.id] = repaymentTx;
  const linkData: Prisma.TransactionLinkUncheckedCreateInput = {
    sourceTransactionId: transactionId,
    linkedTransactionId: repaymentTx.id,
    linkType: 'DEBT_SETTLING',
  };
  const newLink = await tx.transactionLink.create({data: linkData});
  dbUpdates.transactionLinks[newLink.id] = newLink;
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
