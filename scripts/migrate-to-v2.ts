import {PrismaClient, TransactionType} from '@prisma/client';

const NANOS_PER_CENT = BigInt(10_000_000);

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `mysql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
    },
  },
});

type EntryLineInput = {
  ledgerAccountId: number;
  currencyCode: string | null;
  stockId: number | null;
  amountNanos: bigint;
};

type SystemAccounts = {
  expenseId: number;
  incomeId: number;
  equityId: number;
  currencyExchangeId: number;
};

async function main() {
  const users = await prisma.user.findMany({select: {id: true}});
  console.log(`Found ${users.length} users`);

  await prisma.$transaction(async tx => {
    // delete migrated data if any
    await tx.entryLineV2.deleteMany();
    await tx.splitContextV2.deleteMany();
    await tx.ledgerAccountV2.deleteMany();
    await tx.tagV2.deleteMany();
    await tx.transactionLinkV2.deleteMany();
    await tx.transactionPrototypeV2.deleteMany();
    await tx.transactionV2.deleteMany();
  });

  for (const user of users) {
    console.log(`\n=== Migrating user ${user.id} ===`);
    await migrateUser(user.id);
  }

  console.log('\n=== Validating migration ===');
  for (const user of users) {
    await validateUser(user.id);
  }

  console.log('\nMigration complete.');
}

async function migrateUser(userId: number) {
  await prisma.$transaction(
    async tx => {
      const systemAccounts = await createSystemAccounts(tx, userId);
      const assetAccountMap = await createAssetAccounts(tx, userId);
      const receivableAccountMap = await createReceivableAccounts(tx, userId);
      const tagMap = await migrateTags(tx, userId);

      await migrateOpeningBalances(
        tx,
        userId,
        assetAccountMap,
        systemAccounts.equityId
      );

      await migrateTransactions(
        tx,
        userId,
        assetAccountMap,
        systemAccounts,
        receivableAccountMap,
        tagMap
      );

      await migrateTransactionLinks(tx, userId);
      await migrateTransactionPrototypes(tx, userId);
    },
    {timeout: 600_000}
  );
}

async function createSystemAccounts(
  tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
  userId: number
): Promise<SystemAccounts> {
  const expense = await tx.ledgerAccountV2.create({
    data: {userId, name: 'SYSTEM:Expense', type: 'EXPENSE'},
  });
  const income = await tx.ledgerAccountV2.create({
    data: {userId, name: 'SYSTEM:Income', type: 'INCOME'},
  });
  const equity = await tx.ledgerAccountV2.create({
    data: {userId, name: 'SYSTEM:Equity', type: 'EQUITY'},
  });
  const currencyExchange = await tx.ledgerAccountV2.create({
    data: {
      userId,
      name: 'SYSTEM:CurrencyExchange',
      type: 'CURRENCY_EXCHANGE',
    },
  });
  console.log(
    `  Created system accounts: expense=${expense.id}, income=${income.id}, equity=${equity.id}, fx=${currencyExchange.id}`
  );
  return {
    expenseId: expense.id,
    incomeId: income.id,
    equityId: equity.id,
    currencyExchangeId: currencyExchange.id,
  };
}

async function createAssetAccounts(
  tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
  userId: number
): Promise<Map<number, number>> {
  const bankAccounts = await tx.bankAccount.findMany({where: {userId}});
  const map = new Map<number, number>();
  for (const ba of bankAccounts) {
    const ledger = await tx.ledgerAccountV2.create({
      data: {
        userId,
        name: ba.name,
        type: 'ASSET',
        bankAccountId: ba.id,
      },
    });
    map.set(ba.id, ledger.id);
  }
  console.log(`  Created ${map.size} asset accounts`);
  return map;
}

async function createReceivableAccounts(
  tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
  userId: number
): Promise<Map<string, number>> {
  const transactions = await tx.transaction.findMany({
    where: {userId},
    select: {
      id: true,
      otherPartyName: true,
      payer: true,
      transactionType: true,
    },
  });
  const companionNames = new Set<string>();
  for (const t of transactions) {
    if (t.otherPartyName) {
      companionNames.add(t.otherPartyName);
    }
    if (t.transactionType === TransactionType.THIRD_PARTY_EXPENSE) {
      if (!t.payer) {
        throw new Error(`Transaction ${t.id} has no payer`);
      }
      companionNames.add(t.payer);
    }
  }
  const map = new Map<string, number>();
  for (const name of companionNames) {
    const ledger = await tx.ledgerAccountV2.create({
      data: {
        userId,
        name: `RECEIVABLE:${name}`,
        type: 'RECEIVABLE',
      },
    });
    map.set(name, ledger.id);
  }
  console.log(
    `  Created ${map.size} receivable accounts: ${JSON.stringify([...map.entries()])}`
  );
  return map;
}

// Old Tag ID -> new TagV2 ID
async function migrateTags(
  tx: PrismaTx,
  userId: number
): Promise<Map<number, number>> {
  const oldTags = await tx.tag.findMany({where: {userId}});
  const map = new Map<number, number>();
  for (const tag of oldTags) {
    const newTag = await tx.tagV2.create({
      data: {name: tag.name, userId},
    });
    map.set(tag.id, newTag.id);
  }
  console.log(`  Migrated ${map.size} tags`);
  return map;
}

type PrismaTx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

const iids: Map<number, number> = new Map();

async function nextIid(tx: PrismaTx, userId: number): Promise<number> {
  if (!iids.has(userId)) {
    iids.set(userId, 0);
  }
  const iid = iids.get(userId)! + 1;
  iids.set(userId, iid);
  return iid;
}

async function migrateOpeningBalances(
  tx: PrismaTx,
  userId: number,
  assetAccountMap: Map<number, number>,
  equityAccountId: number
) {
  const bankAccounts = await tx.bankAccount.findMany({where: {userId}});
  let count = 0;
  for (const ba of bankAccounts) {
    if (ba.initialBalanceCents === 0) continue;

    const amountNanos = BigInt(ba.initialBalanceCents) * NANOS_PER_CENT;
    const assetLedgerAccountId = assetAccountMap.get(ba.id);
    if (assetLedgerAccountId === undefined) {
      throw new Error(`No asset ledger account for bank account ${ba.id}`);
    }
    const {currencyCode, stockId} = ba;

    const iid = await nextIid(tx, userId);
    await tx.transactionV2.create({
      data: {
        iid,
        userId,
        timestamp: ba.createdAt,
        type: 'OPENING_BALANCE',
        lines: {
          create: [
            {
              ledgerAccountId: assetLedgerAccountId,
              currencyCode,
              stockId,
              amountNanos,
            },
            {
              ledgerAccountId: equityAccountId,
              currencyCode,
              stockId,
              amountNanos: -amountNanos,
            },
          ],
        },
      },
    });
    count++;
  }
  console.log(`  Migrated ${count} opening balances`);
}

async function migrateTransactions(
  tx: PrismaTx,
  userId: number,
  assetAccountMap: Map<number, number>,
  systemAccounts: SystemAccounts,
  receivableAccountMap: Map<string, number>,
  tagMap: Map<number, number>
) {
  const bankAccounts = await tx.bankAccount.findMany({where: {userId}});
  const bankAccountById = new Map(bankAccounts.map(ba => [ba.id, ba]));

  const oldTransactions = await tx.transaction.findMany({
    where: {userId},
    include: {tags: {select: {id: true}}},
    orderBy: {id: 'asc'},
  });
  console.log(`  Migrating ${oldTransactions.length} transactions`);

  let voidCount = 0;
  for (const old of oldTransactions) {
    const iid = await nextIid(tx, userId);
    const v2Type = mapTransactionType(old.transactionType);
    // V1 transactions where all amounts are zero were effectively deleted
    // by the user. In V2, represent these as void transactions.
    if (isZeroedOut(old)) {
      await tx.transactionV2.create({
        data: {
          iid,
          userId,
          timestamp: old.timestamp,
          note: old.description,
          type: v2Type,
          vendor: old.vendor,
          payer: old.payer,
          categoryId: old.categoryId,
          tripId: old.tripId,
          isVoid: true,
        },
      });
      voidCount++;
      continue;
    }

    const lines = buildEntryLines(
      old,
      assetAccountMap,
      systemAccounts,
      receivableAccountMap,
      bankAccountById
    );

    const splits = buildSplitContexts(old);
    const v2TagIds = old.tags.map(t => {
      const newId = tagMap.get(t.id);
      if (newId === undefined) {
        throw new Error(`No TagV2 for old tag ${t.id}`);
      }
      return {id: newId};
    });

    await tx.transactionV2.create({
      data: {
        iid,
        userId,
        timestamp: old.timestamp,
        note: old.description,
        type: v2Type,
        vendor: old.vendor,
        payer: old.payer,
        categoryId: old.categoryId,
        tripId: old.tripId,
        lines: {create: lines},
        tags: {connect: v2TagIds},
        splits: {create: splits},
      },
    });
  }
  console.log(`  Voided ${voidCount} zero-amount transactions`);
  console.log(`  Migrated ${oldTransactions.length} transactions`);
}

function mapTransactionType(
  oldType: TransactionType | null
): 'EXPENSE' | 'INCOME' | 'TRANSFER' | 'THIRD_PARTY_EXPENSE' {
  switch (oldType) {
    case TransactionType.PERSONAL_EXPENSE:
      return 'EXPENSE';
    case TransactionType.THIRD_PARTY_EXPENSE:
      return 'THIRD_PARTY_EXPENSE';
    case TransactionType.INCOME:
      return 'INCOME';
    case TransactionType.TRANSFER:
      return 'TRANSFER';
    case null:
      throw new Error('Transaction type is null');
  }
}

function mustGetAssetAccount(
  bankAccountId: number | null,
  assetAccountMap: Map<number, number>
): number {
  if (bankAccountId === null) {
    throw new Error('Bank account id is null');
  }
  const id = assetAccountMap.get(bankAccountId);
  if (id === undefined) {
    throw new Error(`No asset account for bank account ${bankAccountId}`);
  }
  return id;
}

function mustGetReceivableAccount(
  companionName: string | null,
  receivableAccountMap: Map<string, number>
): number {
  if (companionName === null) {
    throw new Error('Companion name is null');
  }
  const id = receivableAccountMap.get(companionName);
  if (id === undefined) {
    throw new Error(`No receivable account for companion ${companionName}`);
  }
  return id;
}

function resolveBankAccountUnit(
  bankAccountId: number | null,
  bankAccountById: Map<
    number,
    {currencyCode: string | null; stockId: number | null}
  >
): {currencyCode: string | null; stockId: number | null} {
  if (bankAccountId === null) {
    throw new Error('Bank account id is null');
  }
  const ba = bankAccountById.get(bankAccountId);
  if (!ba) {
    throw new Error(`Bank account ${bankAccountId} not found`);
  }
  return {currencyCode: ba.currencyCode, stockId: ba.stockId};
}

type OldTransaction = {
  id: number;
  transactionType: TransactionType | null;
  outgoingAccountId: number | null;
  outgoingAmountCents: number | null;
  incomingAccountId: number | null;
  incomingAmountCents: number | null;
  ownShareAmountCents: number | null;
  otherPartyName: string | null;
  payerOutgoingAmountCents: number | null;
  payer: string | null;
  currencyCode: string | null;
};

// Returns true when all monetary amounts on a V1 transaction are zero,
// indicating the user effectively deleted it in the old system.
function isZeroedOut(old: OldTransaction): boolean {
  return (
    (old.outgoingAmountCents ?? 0) === 0 &&
    (old.incomingAmountCents ?? 0) === 0 &&
    (old.ownShareAmountCents ?? 0) === 0 &&
    (old.payerOutgoingAmountCents ?? 0) === 0
  );
}

function buildEntryLines(
  old: OldTransaction,
  assetAccountMap: Map<number, number>,
  systemAccounts: SystemAccounts,
  receivableAccountMap: Map<string, number>,
  bankAccountById: Map<
    number,
    {currencyCode: string | null; stockId: number | null}
  >
): EntryLineInput[] {
  switch (old.transactionType) {
    case TransactionType.PERSONAL_EXPENSE:
      return buildPersonalExpenseLines(
        old,
        assetAccountMap,
        systemAccounts,
        receivableAccountMap,
        bankAccountById
      );
    case TransactionType.INCOME:
      return buildIncomeLines(
        old,
        assetAccountMap,
        systemAccounts,
        receivableAccountMap,
        bankAccountById
      );
    case TransactionType.TRANSFER:
      return buildTransferLines(
        old,
        assetAccountMap,
        systemAccounts,
        bankAccountById
      );
    case TransactionType.THIRD_PARTY_EXPENSE:
      return buildThirdPartyExpenseLines(
        old,
        systemAccounts,
        receivableAccountMap
      );
    case null:
      throw new Error(`Transaction ${old.id} has null type`);
  }
}

function buildPersonalExpenseLines(
  old: OldTransaction,
  assetAccountMap: Map<number, number>,
  systemAccounts: SystemAccounts,
  receivableAccountMap: Map<string, number>,
  bankAccountById: Map<
    number,
    {currencyCode: string | null; stockId: number | null}
  >
): EntryLineInput[] {
  if (old.outgoingAmountCents === null) {
    throw new Error(`Personal expense ${old.id}: outgoingAmountCents is null`);
  }
  if (old.ownShareAmountCents === null) {
    throw new Error(`Personal expense ${old.id}: ownShareAmountCents is null`);
  }

  const assetAccountId = mustGetAssetAccount(
    old.outgoingAccountId,
    assetAccountMap
  );
  const {currencyCode, stockId} = resolveBankAccountUnit(
    old.outgoingAccountId,
    bankAccountById
  );
  const totalNanos = BigInt(old.outgoingAmountCents) * NANOS_PER_CENT;
  const ownShareNanos = BigInt(old.ownShareAmountCents) * NANOS_PER_CENT;
  const companionShareNanos = totalNanos - ownShareNanos;

  const lines: EntryLineInput[] = [
    {
      ledgerAccountId: assetAccountId,
      currencyCode,
      stockId,
      amountNanos: -totalNanos,
    },
    {
      ledgerAccountId: systemAccounts.expenseId,
      currencyCode,
      stockId,
      amountNanos: ownShareNanos,
    },
  ];

  if (companionShareNanos > BigInt(0)) {
    const receivableId = mustGetReceivableAccount(
      old.otherPartyName,
      receivableAccountMap
    );
    lines.push({
      ledgerAccountId: receivableId,
      currencyCode,
      stockId,
      amountNanos: companionShareNanos,
    });
  }

  return lines;
}

function buildIncomeLines(
  old: OldTransaction,
  assetAccountMap: Map<number, number>,
  systemAccounts: SystemAccounts,
  receivableAccountMap: Map<string, number>,
  bankAccountById: Map<
    number,
    {currencyCode: string | null; stockId: number | null}
  >
): EntryLineInput[] {
  if (old.incomingAmountCents === null) {
    throw new Error(`Income ${old.id}: incomingAmountCents is null`);
  }
  if (old.ownShareAmountCents === null) {
    throw new Error(`Income ${old.id}: ownShareAmountCents is null`);
  }

  const assetAccountId = mustGetAssetAccount(
    old.incomingAccountId,
    assetAccountMap
  );
  const {currencyCode, stockId} = resolveBankAccountUnit(
    old.incomingAccountId,
    bankAccountById
  );
  const totalNanos = BigInt(old.incomingAmountCents) * NANOS_PER_CENT;
  const ownShareNanos = BigInt(old.ownShareAmountCents) * NANOS_PER_CENT;
  const companionShareNanos = totalNanos - ownShareNanos;

  const lines: EntryLineInput[] = [
    {
      ledgerAccountId: assetAccountId,
      currencyCode,
      stockId,
      amountNanos: totalNanos,
    },
    {
      ledgerAccountId: systemAccounts.incomeId,
      currencyCode,
      stockId,
      amountNanos: -ownShareNanos,
    },
  ];

  if (companionShareNanos > BigInt(0)) {
    const receivableId = mustGetReceivableAccount(
      old.otherPartyName,
      receivableAccountMap
    );
    lines.push({
      ledgerAccountId: receivableId,
      currencyCode,
      stockId,
      amountNanos: -companionShareNanos,
    });
  }

  return lines;
}

function buildTransferLines(
  old: OldTransaction,
  assetAccountMap: Map<number, number>,
  systemAccounts: SystemAccounts,
  bankAccountById: Map<
    number,
    {currencyCode: string | null; stockId: number | null}
  >
): EntryLineInput[] {
  if (old.outgoingAmountCents === null) {
    throw new Error(`Transfer ${old.id}: outgoingAmountCents is null`);
  }
  if (old.incomingAmountCents === null) {
    throw new Error(`Transfer ${old.id}: incomingAmountCents is null`);
  }

  const fromAssetId = mustGetAssetAccount(
    old.outgoingAccountId,
    assetAccountMap
  );
  const toAssetId = mustGetAssetAccount(old.incomingAccountId, assetAccountMap);
  const fromUnit = resolveBankAccountUnit(
    old.outgoingAccountId,
    bankAccountById
  );
  const toUnit = resolveBankAccountUnit(old.incomingAccountId, bankAccountById);
  const outNanos = BigInt(old.outgoingAmountCents) * NANOS_PER_CENT;
  const inNanos = BigInt(old.incomingAmountCents) * NANOS_PER_CENT;

  const isCrossCurrency =
    fromUnit.currencyCode !== toUnit.currencyCode ||
    fromUnit.stockId !== toUnit.stockId;

  if (!isCrossCurrency) {
    return [
      {
        ledgerAccountId: fromAssetId,
        currencyCode: fromUnit.currencyCode,
        stockId: fromUnit.stockId,
        amountNanos: -outNanos,
      },
      {
        ledgerAccountId: toAssetId,
        currencyCode: toUnit.currencyCode,
        stockId: toUnit.stockId,
        amountNanos: inNanos,
      },
    ];
  }

  return [
    {
      ledgerAccountId: fromAssetId,
      currencyCode: fromUnit.currencyCode,
      stockId: fromUnit.stockId,
      amountNanos: -outNanos,
    },
    {
      ledgerAccountId: systemAccounts.currencyExchangeId,
      currencyCode: fromUnit.currencyCode,
      stockId: fromUnit.stockId,
      amountNanos: outNanos,
    },
    {
      ledgerAccountId: systemAccounts.currencyExchangeId,
      currencyCode: toUnit.currencyCode,
      stockId: toUnit.stockId,
      amountNanos: -inNanos,
    },
    {
      ledgerAccountId: toAssetId,
      currencyCode: toUnit.currencyCode,
      stockId: toUnit.stockId,
      amountNanos: inNanos,
    },
  ];
}

function buildThirdPartyExpenseLines(
  old: OldTransaction,
  systemAccounts: SystemAccounts,
  receivableAccountMap: Map<string, number>
): EntryLineInput[] {
  if (old.payerOutgoingAmountCents === null) {
    throw new Error(
      `Third-party expense ${old.id}: payerOutgoingAmountCents is null`
    );
  }
  if (old.ownShareAmountCents === null) {
    throw new Error(
      `Third-party expense ${old.id}: ownShareAmountCents is null`
    );
  }
  if (old.payer === null) {
    throw new Error(`Third-party expense ${old.id}: payer is null`);
  }
  if (old.currencyCode === null) {
    throw new Error(`Third-party expense ${old.id}: currencyCode is null`);
  }

  const ownShareNanos = BigInt(old.ownShareAmountCents) * NANOS_PER_CENT;
  const receivableId = mustGetReceivableAccount(
    old.payer,
    receivableAccountMap
  );

  return [
    {
      ledgerAccountId: systemAccounts.expenseId,
      currencyCode: old.currencyCode,
      stockId: null,
      amountNanos: ownShareNanos,
    },
    {
      ledgerAccountId: receivableId,
      currencyCode: old.currencyCode,
      stockId: null,
      amountNanos: -ownShareNanos,
    },
  ];
}

function buildSplitContexts(old: {
  transactionType: TransactionType | null;
  outgoingAmountCents: number | null;
  ownShareAmountCents: number | null;
  otherPartyName: string | null;
  payerOutgoingAmountCents: number | null;
  payer: string | null;
  incomingAmountCents: number | null;
}): Array<{
  companionName: string;
  companionShareNanos: bigint;
  companionPaidNanos: bigint;
}> {
  switch (old.transactionType) {
    case TransactionType.PERSONAL_EXPENSE: {
      if (
        old.ownShareAmountCents === null ||
        old.outgoingAmountCents === null
      ) {
        return [];
      }
      if (old.ownShareAmountCents === old.outgoingAmountCents) {
        return [];
      }
      if (old.otherPartyName === null) {
        return [];
      }
      const companionShareNanos =
        BigInt(old.outgoingAmountCents - old.ownShareAmountCents) *
        NANOS_PER_CENT;
      return [
        {
          companionName: old.otherPartyName,
          companionShareNanos,
          companionPaidNanos: BigInt(0),
        },
      ];
    }
    case TransactionType.INCOME: {
      if (
        old.ownShareAmountCents === null ||
        old.incomingAmountCents === null
      ) {
        return [];
      }
      if (old.ownShareAmountCents === old.incomingAmountCents) {
        return [];
      }
      if (old.otherPartyName === null) {
        return [];
      }
      const companionShareNanos =
        BigInt(old.incomingAmountCents - old.ownShareAmountCents) *
        NANOS_PER_CENT;
      return [
        {
          companionName: old.otherPartyName,
          companionShareNanos,
          companionPaidNanos: BigInt(0),
        },
      ];
    }
    case TransactionType.THIRD_PARTY_EXPENSE: {
      if (
        old.payerOutgoingAmountCents === null ||
        old.ownShareAmountCents === null ||
        old.payer === null
      ) {
        return [];
      }
      const companionShareNanos =
        BigInt(old.payerOutgoingAmountCents - old.ownShareAmountCents) *
        NANOS_PER_CENT;
      const companionPaidNanos =
        BigInt(old.payerOutgoingAmountCents) * NANOS_PER_CENT;
      return [
        {
          companionName: old.payer,
          companionShareNanos,
          companionPaidNanos,
        },
      ];
    }
    case TransactionType.TRANSFER:
      return [];
    case null:
      return [];
  }
}

async function migrateTransactionLinks(tx: PrismaTx, userId: number) {
  const oldLinks = await tx.transactionLink.findMany({
    where: {
      sourceTransaction: {userId},
    },
    include: {
      sourceTransaction: true,
      linkedTransaction: true,
    },
  });

  const oldToNewTxId = await buildOldToNewIdMap(tx, userId);
  let count = 0;

  for (const link of oldLinks) {
    const newSourceId = oldToNewTxId.get(link.sourceTransactionId);
    const newLinkedId = oldToNewTxId.get(link.linkedTransactionId);
    if (newSourceId === undefined) {
      throw new Error(
        `No V2 transaction for old source id ${link.sourceTransactionId}`
      );
    }
    if (newLinkedId === undefined) {
      throw new Error(
        `No V2 transaction for old linked id ${link.linkedTransactionId}`
      );
    }
    await tx.transactionLinkV2.create({
      data: {
        sourceTransactionId: newSourceId,
        linkedTransactionId: newLinkedId,
        linkType: link.linkType,
      },
    });
    count++;
  }
  console.log(`  Migrated ${count} transaction links`);
}

async function migrateTransactionPrototypes(tx: PrismaTx, userId: number) {
  const oldProtos = await tx.transactionPrototype.findMany({
    where: {userId},
  });
  const oldToNewTxId = await buildOldToNewIdMap(tx, userId);
  let count = 0;

  for (const proto of oldProtos) {
    const newTxId = oldToNewTxId.get(proto.internalTransactionId);
    if (newTxId === undefined) {
      throw new Error(
        `No V2 transaction for old prototype reference ${proto.internalTransactionId}`
      );
    }
    await tx.transactionPrototypeV2.create({
      data: {
        externalId: proto.externalId,
        externalDescription: proto.externalDescription,
        internalTransactionId: newTxId,
        userId,
      },
    });
    count++;
  }
  console.log(`  Migrated ${count} transaction prototypes`);
}

async function buildOldToNewIdMap(
  tx: PrismaTx,
  userId: number
): Promise<Map<number, number>> {
  const oldTransactions = await tx.transaction.findMany({
    where: {userId},
    select: {id: true},
    orderBy: {id: 'asc'},
  });
  const newTransactions = await tx.transactionV2.findMany({
    where: {userId, supersedesId: null},
    select: {id: true, iid: true},
    orderBy: {iid: 'asc'},
  });

  // Opening balance transactions have higher IIDs than migrated transactions.
  // The migrated transactions are ordered by old id (asc), so we can pair them.
  // We need to skip opening balance transactions (which don't have old counterparts).
  const bankAccountsWithBalance = await tx.bankAccount.findMany({
    where: {userId, NOT: {initialBalanceCents: 0}},
  });
  const openingBalanceCount = bankAccountsWithBalance.length;

  // Opening balances were created first, so they have the lowest IIDs.
  // Migrated transactions come after.
  const migratedV2 = newTransactions.slice(openingBalanceCount);

  if (migratedV2.length !== oldTransactions.length) {
    throw new Error(
      `Transaction count mismatch: ${oldTransactions.length} old vs ${migratedV2.length} migrated V2 (${openingBalanceCount} opening balances skipped)`
    );
  }

  const map = new Map<number, number>();
  for (let i = 0; i < oldTransactions.length; i++) {
    map.set(oldTransactions[i].id, migratedV2[i].id);
  }
  return map;
}

async function validateUser(userId: number) {
  console.log(`  Validating user ${userId}...`);

  const newTransactions = await prisma.transactionV2.findMany({
    where: {userId},
    include: {lines: true},
  });

  // Validate per-currency balance rule
  for (const tx of newTransactions) {
    const sumsByCurrency = new Map<string, bigint>();
    for (const line of tx.lines) {
      const key = line.currencyCode ?? `stock:${line.stockId}`;
      const current = sumsByCurrency.get(key) ?? BigInt(0);
      sumsByCurrency.set(key, current + line.amountNanos);
    }
    for (const [currency, sum] of sumsByCurrency) {
      if (sum !== BigInt(0)) {
        throw new Error(
          `Balance rule violation: transaction ${tx.id} (iid ${tx.iid}), ` +
            `currency ${currency}, sum = ${sum}`
        );
      }
    }
  }

  // Validate IID uniqueness (only non-superseded, non-void)
  const supersededIds = new Set<number>();
  for (const tx of newTransactions) {
    if (tx.supersedesId !== null) {
      supersededIds.add(tx.supersedesId);
    }
  }
  const active = newTransactions.filter(
    tx => !supersededIds.has(tx.id) && !tx.isVoid
  );
  const iidCounts = new Map<number, number>();
  for (const tx of active) {
    iidCounts.set(tx.iid, (iidCounts.get(tx.iid) ?? 0) + 1);
  }
  for (const [iid, count] of iidCounts) {
    if (count > 1) {
      throw new Error(
        `IID uniqueness violation: user ${userId}, IID ${iid} has ${count} active versions`
      );
    }
  }

  // Validate old balances match new balances
  const bankAccounts = await prisma.bankAccount.findMany({where: {userId}});
  const oldTransactions = await prisma.transaction.findMany({where: {userId}});

  for (const ba of bankAccounts) {
    const oldBalance = computeOldBalance(ba, oldTransactions);
    const ledger = await prisma.ledgerAccountV2.findFirst({
      where: {bankAccountId: ba.id},
    });
    if (!ledger) {
      throw new Error(`No ledger account for bank account ${ba.id}`);
    }

    const activeLines = active.flatMap(tx => tx.lines);
    const accountLines = activeLines.filter(
      l => l.ledgerAccountId === ledger.id
    );
    const newBalance = accountLines.reduce(
      (sum, l) => sum + l.amountNanos,
      BigInt(0)
    );
    const oldBalanceNanos = BigInt(oldBalance) * NANOS_PER_CENT;

    if (newBalance !== oldBalanceNanos) {
      throw new Error(
        `Balance mismatch for bank account ${ba.id} (${ba.name}): ` +
          `old = ${oldBalance} cents (${oldBalanceNanos} nanos), ` +
          `new = ${newBalance} nanos`
      );
    }
  }

  console.log(`  User ${userId} validation passed`);
}

function computeOldBalance(
  bankAccount: {id: number; initialBalanceCents: number},
  transactions: Array<{
    outgoingAccountId: number | null;
    outgoingAmountCents: number | null;
    incomingAccountId: number | null;
    incomingAmountCents: number | null;
  }>
): number {
  let balance = bankAccount.initialBalanceCents;
  for (const tx of transactions) {
    if (tx.outgoingAccountId === bankAccount.id && tx.outgoingAmountCents) {
      balance -= tx.outgoingAmountCents;
    }
    if (tx.incomingAccountId === bankAccount.id && tx.incomingAmountCents) {
      balance += tx.incomingAmountCents;
    }
  }
  return balance;
}

main()
  .catch(e => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
