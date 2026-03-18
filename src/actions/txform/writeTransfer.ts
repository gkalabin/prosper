import {
  type EntryLineInput,
  bankAccountUnit,
  fetchOrCreateTagV2s,
  mustFindAccount,
  mustFindAsset,
  writeUsedProtosV2,
} from '@/actions/txform/shared';
import {TransferFormSchema} from '@/components/txform/transfer/types';
import {type TransactionPrototype} from '@/lib/txsuggestions/TransactionPrototype';
import {dollarToNanos} from '@/lib/util/util';
import {
  LedgerAccountType,
  LedgerAccountV2,
  Prisma,
  TransactionV2Type,
} from '@prisma/client';

export async function writeTransfer(
  tx: Prisma.TransactionClient,
  args: {
    userId: number;
    iid: number;
    supersedesId: number | null;
    transfer: TransferFormSchema;
    ledgerAccounts: LedgerAccountV2[];
    protos: TransactionPrototype[];
    transactionIdToSupersede: number | null;
  }
) {
  const {userId, iid, supersedesId, transfer, ledgerAccounts, protos} = args;
  const entryLines = await buildTransferLines(tx, transfer, ledgerAccounts);
  const tags = await fetchOrCreateTagV2s(tx, transfer.tagNames, userId);
  const newTx = await tx.transactionV2.create({
    data: {
      iid,
      userId,
      timestamp: transfer.timestamp,
      note: transfer.description ?? '',
      type: TransactionV2Type.TRANSFER,
      categoryId: transfer.categoryId,
      supersedesId,
      lines: {create: entryLines},
      tags: {connect: tags.map(t => ({id: t.id}))},
    },
  });
  await writeUsedProtosV2({tx, protos, transactionId: newTx.id, userId});
}

async function buildTransferLines(
  tx: Prisma.TransactionClient,
  transfer: TransferFormSchema,
  ledgerAccounts: LedgerAccountV2[]
): Promise<EntryLineInput[]> {
  const fromAsset = mustFindAsset(ledgerAccounts, transfer.fromAccountId);
  const toAsset = mustFindAsset(ledgerAccounts, transfer.toAccountId);
  const fromUnit = await bankAccountUnit(tx, transfer.fromAccountId);
  const toUnit = await bankAccountUnit(tx, transfer.toAccountId);
  const sentNanos = dollarToNanos(transfer.amountSent);
  const receivedNanos = dollarToNanos(transfer.amountReceived);
  const isSameUnit =
    (fromUnit.currencyCode !== null &&
      fromUnit.currencyCode === toUnit.currencyCode) ||
    (fromUnit.stockId !== null && fromUnit.stockId === toUnit.stockId);
  if (isSameUnit) {
    return [
      {
        ledgerAccountId: fromAsset.id,
        ...fromUnit,
        amountNanos: -sentNanos,
      },
      {
        ledgerAccountId: toAsset.id,
        ...toUnit,
        amountNanos: receivedNanos,
      },
    ];
  }
  // Cross-unit transfer: four lines via the currency exchange account.
  const fxAccount = mustFindAccount(
    ledgerAccounts,
    LedgerAccountType.CURRENCY_EXCHANGE
  );
  return [
    {
      ledgerAccountId: fromAsset.id,
      ...fromUnit,
      amountNanos: -sentNanos,
    },
    {
      ledgerAccountId: fxAccount.id,
      ...fromUnit,
      amountNanos: sentNanos,
    },
    {
      ledgerAccountId: fxAccount.id,
      ...toUnit,
      amountNanos: -receivedNanos,
    },
    {
      ledgerAccountId: toAsset.id,
      ...toUnit,
      amountNanos: receivedNanos,
    },
  ];
}
