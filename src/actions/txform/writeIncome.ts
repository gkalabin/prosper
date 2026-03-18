import {
  type EntryLineInput,
  type SplitInput,
  bankAccountUnit,
  fetchOrCreateTagV2s,
  findOrCreateReceivableAccount,
  mustFindAccount,
  mustFindAsset,
  writeUsedProtosV2,
} from '@/actions/txform/shared';
import {IncomeFormSchema} from '@/components/txform/income/types';
import {assertDefined} from '@/lib/assert';
import {type TransactionPrototype} from '@/lib/txsuggestions/TransactionPrototype';
import {dollarToNanos} from '@/lib/util/util';
import {
  LedgerAccountType,
  LedgerAccountV2,
  Prisma,
  TransactionV2Type,
} from '@prisma/client';

export async function writeIncome(
  tx: Prisma.TransactionClient,
  args: {
    userId: number;
    iid: number;
    supersedesId: number | null;
    income: IncomeFormSchema;
    ledgerAccounts: LedgerAccountV2[];
    protos: TransactionPrototype[];
    transactionIdToSupersede: number | null;
  }
) {
  const {userId, iid, supersedesId, income, ledgerAccounts, protos} = args;
  const entryLines = await buildIncomeEntryLines(
    tx,
    income,
    ledgerAccounts,
    userId
  );
  const splits = buildIncomeSplitContext(income);
  const tags = await fetchOrCreateTagV2s(tx, income.tagNames, userId);
  const newTx = await tx.transactionV2.create({
    data: {
      iid,
      userId,
      timestamp: income.timestamp,
      note: income.description ?? '',
      type: TransactionV2Type.INCOME,
      payer: income.payer,
      categoryId: income.categoryId,
      supersedesId,
      lines: {create: entryLines},
      tags: {connect: tags.map(t => ({id: t.id}))},
      splits: {create: splits},
    },
  });
  await writeUsedProtosV2({tx, protos, transactionId: newTx.id, userId});
  if (income.parentTransactionId) {
    await tx.transactionLinkV2.create({
      data: {
        sourceTransactionId: income.parentTransactionId,
        linkedTransactionId: newTx.id,
        linkType: 'REFUND',
      },
    });
  }
}

async function buildIncomeEntryLines(
  tx: Prisma.TransactionClient,
  income: IncomeFormSchema,
  ledgerAccounts: LedgerAccountV2[],
  userId: number
): Promise<EntryLineInput[]> {
  const assetAccount = mustFindAsset(ledgerAccounts, income.accountId);
  const unit = await bankAccountUnit(tx, income.accountId);
  const totalNanos = dollarToNanos(income.amount);
  const ownShareNanos = income.isShared
    ? dollarToNanos(income.ownShareAmount)
    : totalNanos;
  const companionShareNanos = totalNanos - ownShareNanos;
  const incomeAccount = mustFindAccount(
    ledgerAccounts,
    LedgerAccountType.INCOME
  );
  const lines: EntryLineInput[] = [
    {
      ledgerAccountId: assetAccount.id,
      amountNanos: totalNanos,
      ...unit,
    },
    {
      ledgerAccountId: incomeAccount.id,
      amountNanos: -ownShareNanos,
      ...unit,
    },
  ];
  if (companionShareNanos > BigInt(0)) {
    assertDefined(income.companion);
    const receivableAccount = await findOrCreateReceivableAccount(
      tx,
      ledgerAccounts,
      income.companion,
      userId
    );
    lines.push({
      ledgerAccountId: receivableAccount.id,
      amountNanos: -companionShareNanos,
      ...unit,
    });
  }
  return lines;
}

function buildIncomeSplitContext(income: IncomeFormSchema): SplitInput[] {
  if (!income.isShared) {
    return [];
  }
  assertDefined(income.companion);
  const totalNanos = dollarToNanos(income.amount);
  const ownShareNanos = dollarToNanos(income.ownShareAmount);
  return [
    {
      companionName: income.companion,
      companionShareNanos: totalNanos - ownShareNanos,
      companionPaidNanos: BigInt(0),
    },
  ];
}
