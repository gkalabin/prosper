import {
  type EntryLineInput,
  type SplitInput,
  bankAccountUnit,
  fetchOrCreateTags,
  findOrCreateReceivableAccount,
  getOrCreateTrip,
  mustFindAccount,
  mustFindAsset,
  nextIid,
  writeUsedProtos,
} from '@/actions/txform/shared';
import {ExpenseFormSchema} from '@/components/txform/expense/types';
import {assert, assertDefined} from '@/lib/assert';
import {type TransactionPrototype} from '@/lib/txsuggestions/TransactionPrototype';
import {dollarToNanos} from '@/lib/util/util';
import {
  LedgerAccountType,
  LedgerAccount,
  Prisma,
  TransactionType,
} from '@prisma/client';

export async function writeExpense(
  tx: Prisma.TransactionClient,
  args: {
    userId: number;
    iid: number;
    supersedesId: number | null;
    expense: ExpenseFormSchema;
    ledgerAccounts: LedgerAccount[];
    protos: TransactionPrototype[];
    transactionIdToSupersede: number | null;
  }
) {
  const {userId, iid, supersedesId, expense, ledgerAccounts, protos} = args;
  const transactionType = expenseTransactionType(expense);
  const entryLines = await buildExpenseEntryLines(
    tx,
    expense,
    ledgerAccounts,
    userId
  );
  const splits = buildExpenseSplitContext(expense);
  const tags = await fetchOrCreateTags(tx, expense.tagNames, userId);
  const trip = await getOrCreateTrip({
    tx,
    tripName: expense.tripName,
    userId,
  });
  const newTx = await tx.transaction.create({
    data: {
      iid,
      userId,
      type: transactionType,
      timestamp: expense.timestamp,
      note: expense.description ?? '',
      vendor: expense.vendor,
      payer:
        transactionType === TransactionType.THIRD_PARTY_EXPENSE
          ? expense.payer
          : null,
      categoryId: expense.categoryId,
      tripId: trip?.id ?? null,
      supersedesId,
      lines: {create: entryLines},
      tags: {connect: tags.map(t => ({id: t.id}))},
      splits: {create: splits},
    },
  });
  await writeUsedProtos({tx, protos, transactionId: newTx.id, userId});
  // Handle repayment: someone paid for the user and they already paid them back.
  // This results in two linked transactions.
  if (expense.sharingType === 'PAID_OTHER_REPAID') {
    await writeRepaymentForExpense(tx, {
      userId,
      sourceTransactionId: newTx.id,
      expense,
      ledgerAccounts,
      transactionIdToSupersede: args.transactionIdToSupersede,
    });
  }
}

function expenseTransactionType(expense: ExpenseFormSchema): TransactionType {
  const paidSelf =
    expense.sharingType === 'PAID_SELF_NOT_SHARED' ||
    expense.sharingType === 'PAID_SELF_SHARED';
  return paidSelf
    ? TransactionType.EXPENSE
    : TransactionType.THIRD_PARTY_EXPENSE;
}

async function buildExpenseEntryLines(
  tx: Prisma.TransactionClient,
  expense: ExpenseFormSchema,
  ledgerAccounts: LedgerAccount[],
  userId: number
): Promise<EntryLineInput[]> {
  const paidSelf =
    expense.sharingType === 'PAID_SELF_NOT_SHARED' ||
    expense.sharingType === 'PAID_SELF_SHARED';
  if (paidSelf) {
    return buildPaidSelfEntryLines(tx, expense, ledgerAccounts, userId);
  }
  return buildThirdPartyEntryLines(tx, expense, ledgerAccounts, userId);
}

async function buildPaidSelfEntryLines(
  tx: Prisma.TransactionClient,
  expense: ExpenseFormSchema,
  ledgerAccounts: LedgerAccount[],
  userId: number
): Promise<EntryLineInput[]> {
  assertDefined(expense.accountId);
  const assetAccount = mustFindAsset(ledgerAccounts, expense.accountId);
  const expenseAccount = mustFindAccount(
    ledgerAccounts,
    LedgerAccountType.EXPENSE
  );
  const unit = await bankAccountUnit(tx, expense.accountId);
  const totalNanos = dollarToNanos(expense.amount);
  const lines: EntryLineInput[] = [
    {
      ledgerAccountId: assetAccount.id,
      amountNanos: -totalNanos,
      ...unit,
    },
  ];
  if (expense.sharingType === 'PAID_SELF_NOT_SHARED') {
    lines.push({
      ledgerAccountId: expenseAccount.id,
      amountNanos: totalNanos,
      ...unit,
    });
    return lines;
  }
  // Shared expense: user's share goes to expense, companion's share to receivable.
  assertDefined(expense.companion);
  const ownShareNanos = dollarToNanos(expense.ownShareAmount);
  const companionShareNanos = totalNanos - ownShareNanos;
  const receivableAccount = await findOrCreateReceivableAccount(
    tx,
    ledgerAccounts,
    expense.companion,
    userId
  );
  lines.push(
    {
      ledgerAccountId: expenseAccount.id,
      amountNanos: ownShareNanos,
      ...unit,
    },
    {
      ledgerAccountId: receivableAccount.id,
      amountNanos: companionShareNanos,
      ...unit,
    }
  );
  return lines;
}

// The user owes the payer; expense absorbs the user's share, receivable tracks the debt.
async function buildThirdPartyEntryLines(
  tx: Prisma.TransactionClient,
  expense: ExpenseFormSchema,
  ledgerAccounts: LedgerAccount[],
  userId: number
): Promise<EntryLineInput[]> {
  assert(
    expense.sharingType === 'PAID_OTHER_OWED' ||
      expense.sharingType === 'PAID_OTHER_REPAID'
  );
  // Third party expenses are not linked to any user's account, so currency has to be specified explicitly.
  assertDefined(expense.currency);
  assertDefined(expense.payer);
  const ownShareNanos = dollarToNanos(expense.ownShareAmount);
  const expenseAccount = mustFindAccount(
    ledgerAccounts,
    LedgerAccountType.EXPENSE
  );
  const receivableAccount = await findOrCreateReceivableAccount(
    tx,
    ledgerAccounts,
    expense.payer,
    userId
  );
  return [
    {
      ledgerAccountId: expenseAccount.id,
      currencyCode: expense.currency,
      stockId: null,
      amountNanos: ownShareNanos,
    },
    {
      ledgerAccountId: receivableAccount.id,
      currencyCode: expense.currency,
      stockId: null,
      amountNanos: -ownShareNanos,
    },
  ];
}

function buildExpenseSplitContext(expense: ExpenseFormSchema): SplitInput[] {
  const {sharingType} = expense;
  if (sharingType === 'PAID_SELF_NOT_SHARED') {
    return [];
  }
  if (sharingType === 'PAID_SELF_SHARED') {
    assertDefined(expense.companion);
    const totalNanos = dollarToNanos(expense.amount);
    const ownShareNanos = dollarToNanos(expense.ownShareAmount);
    return [
      {
        companionName: expense.companion,
        companionShareNanos: totalNanos - ownShareNanos,
        companionPaidNanos: BigInt(0),
      },
    ];
  }
  // Third-party expense: the payer paid the full amount, user owes them usually half.
  assertDefined(expense.payer);
  const payerPaidNanos = dollarToNanos(expense.amount);
  const ownShareNanos = dollarToNanos(expense.ownShareAmount);
  return [
    {
      companionName: expense.payer,
      companionShareNanos: payerPaidNanos - ownShareNanos,
      companionPaidNanos: payerPaidNanos,
    },
  ];
}

async function writeRepaymentForExpense(
  tx: Prisma.TransactionClient,
  args: {
    userId: number;
    sourceTransactionId: number;
    expense: ExpenseFormSchema;
    ledgerAccounts: LedgerAccount[];
    transactionIdToSupersede: number | null;
  }
) {
  const {userId, sourceTransactionId, expense, ledgerAccounts} = args;
  const repayment = expense.repayment;
  assertDefined(repayment);
  assertDefined(expense.payer);
  const assetAccount = mustFindAsset(ledgerAccounts, repayment.accountId);
  const unit = await bankAccountUnit(tx, repayment.accountId);
  const ownShareNanos = dollarToNanos(expense.ownShareAmount);
  const receivableAccount = await findOrCreateReceivableAccount(
    tx,
    ledgerAccounts,
    expense.payer,
    userId
  );
  const {repaymentSupersedesId, repaymentIid} = await findRepaymentSupersedes(
    tx,
    userId,
    args.transactionIdToSupersede
  );
  const repaymentTx = await tx.transaction.create({
    data: {
      iid: repaymentIid,
      userId,
      timestamp: repayment.timestamp,
      // TODO: i18n
      note: 'Paid back for ' + expense.vendor,
      type: TransactionType.EXPENSE,
      vendor: expense.payer,
      categoryId: repayment.categoryId,
      supersedesId: repaymentSupersedesId,
      lines: {
        create: [
          {
            ledgerAccountId: assetAccount.id,
            amountNanos: -ownShareNanos,
            ...unit,
          },
          {
            ledgerAccountId: receivableAccount.id,
            amountNanos: ownShareNanos,
            ...unit,
          },
        ],
      },
    },
  });
  await tx.transactionLink.create({
    data: {
      sourceTransactionId: sourceTransactionId,
      linkedTransactionId: repaymentTx.id,
      linkType: 'DEBT_SETTLING',
    },
  });
}

async function findRepaymentSupersedes(
  tx: Prisma.TransactionClient,
  userId: number,
  transactionIdToSupersede: number | null
): Promise<{repaymentSupersedesId: number | null; repaymentIid: number}> {
  if (transactionIdToSupersede !== null) {
    const existingLink = await tx.transactionLink.findFirst({
      where: {
        sourceTransactionId: transactionIdToSupersede,
        linkType: 'DEBT_SETTLING',
      },
    });
    if (existingLink) {
      const oldRepayment = await tx.transaction.findUniqueOrThrow({
        where: {id: existingLink.linkedTransactionId},
      });
      return {
        repaymentSupersedesId: oldRepayment.id,
        repaymentIid: oldRepayment.iid,
      };
    }
    // No existing repayment found, fall through to create a new one.
  }
  const repaymentIid = await nextIid(tx, userId);
  return {repaymentSupersedesId: null, repaymentIid};
}
