import {
  type TransactionPrototype,
  WithdrawalOrDepositPrototype,
} from '@/lib/txsuggestions/TransactionPrototype';
import {
  LedgerAccountType,
  LedgerAccount,
  Prisma,
  Tag,
  Trip,
} from '@prisma/client';

export type BankAccountUnit =
  | {currencyCode: string; stockId: null}
  | {currencyCode: null; stockId: number};

export type EntryLineInput = {
  ledgerAccountId: number;
  currencyCode: string | null;
  stockId: number | null;
  amountNanos: bigint;
};

export type SplitInput = {
  companionName: string;
  companionShareNanos: bigint;
  companionPaidNanos: bigint;
};

export async function nextIid(
  tx: Prisma.TransactionClient,
  userId: number
): Promise<number> {
  const result = await tx.transaction.aggregate({
    where: {userId},
    _max: {iid: true},
  });
  return (result._max.iid ?? 0) + 1;
}

export function mustFindAccount(
  ledgerAccounts: LedgerAccount[],
  type: LedgerAccountType
): LedgerAccount {
  const accounts = ledgerAccounts.filter(a => a.type === type);
  if (accounts.length !== 1) {
    throw new Error(
      `Expected 1 ledger account of type ${type}, found ${accounts.length}`
    );
  }
  return accounts[0];
}

export function mustFindAsset(
  ledgerAccounts: LedgerAccount[],
  bankAccountId: number
): LedgerAccount {
  const accounts = ledgerAccounts.filter(
    a => a.type === LedgerAccountType.ASSET && a.bankAccountId === bankAccountId
  );
  if (accounts.length !== 1) {
    throw new Error(
      `Expected 1 asset ledger account for bankAccountId=${bankAccountId}, found ${accounts.length}`
    );
  }
  return accounts[0];
}

export async function findOrCreateReceivableAccount(
  tx: Prisma.TransactionClient,
  ledgerAccounts: LedgerAccount[],
  companionName: string,
  userId: number
): Promise<LedgerAccount> {
  const name = `RECEIVABLE:${companionName}`;
  const existing = ledgerAccounts.find(
    a => a.type === LedgerAccountType.RECEIVABLE && a.name === name
  );
  if (existing) {
    return existing;
  }
  const created = await tx.ledgerAccount.create({
    data: {userId, name, type: LedgerAccountType.RECEIVABLE},
  });
  // Add to the in-memory list so that other calls within the same
  // DB transaction (e.g. a repayment created alongside its expense)
  // can find this account without an extra DB round-trip.
  ledgerAccounts.push(created);
  return created;
}

// Resolves the unit (currency or stock) for a bank account.
// Every bank account must have exactly one of currencyCode or stockId.
export async function bankAccountUnit(
  tx: Prisma.TransactionClient,
  bankAccountId: number
): Promise<BankAccountUnit> {
  const bankAccount = await tx.bankAccount.findUniqueOrThrow({
    where: {id: bankAccountId},
    select: {currencyCode: true, stockId: true},
  });
  if (bankAccount.currencyCode && bankAccount.stockId) {
    throw new Error(
      `BankAccount ${bankAccountId} has both currencyCode and stockId`
    );
  }
  if (bankAccount.currencyCode) {
    return {currencyCode: bankAccount.currencyCode, stockId: null};
  }
  if (bankAccount.stockId) {
    return {currencyCode: null, stockId: bankAccount.stockId};
  }
  throw new Error(
    `BankAccount ${bankAccountId} has neither currencyCode nor stockId`
  );
}

export async function getOrCreateTrip({
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

export async function fetchOrCreateTags(
  tx: Prisma.TransactionClient,
  tagNames: string[],
  userId: number
): Promise<Tag[]> {
  if (!tagNames.length) {
    return [];
  }
  const existing = await tx.tag.findMany({
    where: {userId, name: {in: tagNames}},
  });
  const newNames = tagNames.filter(x => existing.every(t => t.name != x));
  const created = await Promise.all(
    newNames.map(name => tx.tag.create({data: {name, userId}}))
  );
  return [...existing, ...created];
}

export async function writeUsedProtos({
  tx,
  protos,
  transactionId,
  userId,
}: {
  tx: Prisma.TransactionClient;
  protos: TransactionPrototype[];
  transactionId: number;
  userId: number;
}): Promise<void> {
  if (!protos.length) {
    return;
  }
  // Transfer protos consist of two parts: deposit and withdrawal.
  // Replace all the transfers in the input with their parts to simplify the insert.
  const plainProtos: WithdrawalOrDepositPrototype[] = protos.flatMap(proto =>
    proto.type == 'transfer' ? [proto.deposit, proto.withdrawal] : [proto]
  );

  await Promise.all(
    plainProtos.map(proto =>
      tx.transactionPrototype.create({
        data: {
          internalTransactionId: transactionId,
          externalId: proto.externalTransactionId,
          externalDescription: proto.originalDescription,
          userId,
        },
      })
    )
  );
}
