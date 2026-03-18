'use server';
import {getUserIdOrRedirect} from '@/lib/auth/user';
import {latestVersionOnly} from '@/lib/ClientSideModel';
import {DB} from '@/lib/db';
import {fillUnitData} from '@/lib/db/bank-account';
import {updateCoreDataCache, updateTransactionDataCache} from '@/lib/db/cache';
import {
  AccountFormSchema,
  accountFormValidationSchema,
} from '@/lib/form-types/AccountFormSchema';
import prisma from '@/lib/prisma';
import {centsToNanos, dollarToCents} from '@/lib/util/util';
import {BankAccount, LedgerAccountV2, Prisma} from '@prisma/client';
import {type typeToFlattenedError} from 'zod';

export type UpsertBankAccountResult =
  | {
      status: 'SUCCESS';
      data: BankAccount;
    }
  | {
      status: 'CLIENT_ERROR';
      errors: typeToFlattenedError<AccountFormSchema>;
    };

export async function upsertBankAccount(
  accountId: number | null,
  unsafeData: AccountFormSchema
): Promise<UpsertBankAccountResult> {
  const userId = await getUserIdOrRedirect();
  const validatedData = accountFormValidationSchema.safeParse(unsafeData);
  if (!validatedData.success) {
    return {
      status: 'CLIENT_ERROR',
      errors: validatedData.error.flatten(),
    };
  }
  const unit = validatedData.data.unit;
  const data = {
    name: validatedData.data.name,
    displayOrder: validatedData.data.displayOrder,
    bankId: validatedData.data.bankId,
    archived: validatedData.data.isArchived,
    joint: validatedData.data.isJoint,
    initialBalanceCents: dollarToCents(validatedData.data.initialBalance),
    userId,
  };
  const amountNanos = centsToNanos(data.initialBalanceCents);
  if (accountId) {
    // Verify the account exists before attempting to update.
    const db = new DB({userId});
    const found = await db.bankAccountFindMany({where: {id: accountId}});
    if (!found?.length) {
      return {
        status: 'CLIENT_ERROR',
        errors: {
          formErrors: [`Account with id ${accountId} is not found`],
          fieldErrors: {},
        },
      };
    }
  }

  await fillUnitData(unit, data);
  const result = await prisma.$transaction(async tx => {
    const bankAccount = accountId
      ? await tx.bankAccount.update({data, where: {id: accountId}})
      : await tx.bankAccount.create({data});
    const ledgerAccount = await tx.ledgerAccountV2.upsert({
      where: {bankAccountId: bankAccount.id},
      create: {
        userId,
        name: bankAccount.name,
        type: 'ASSET',
        bankAccountId: bankAccount.id,
      },
      update: {},
    });
    await syncOpeningBalance(
      tx,
      userId,
      bankAccount,
      ledgerAccount,
      amountNanos
    );
    return bankAccount;
  });
  await updateCoreDataCache(userId);
  await updateTransactionDataCache(userId);
  return {status: 'SUCCESS', data: result};
}

async function makeOpeningBalanceLines(
  tx: Prisma.TransactionClient,
  userId: number,
  bankAccount: BankAccount,
  ledgerAccount: LedgerAccountV2,
  amountNanos: bigint
) {
  if (amountNanos == BigInt(0)) {
    return [];
  }
  const equityAccounts = await tx.ledgerAccountV2.findMany({
    where: {userId, type: 'EQUITY'},
  });
  if (equityAccounts.length != 1) {
    throw new Error(
      `Found ${equityAccounts.length} equity accounts for user ${userId}, want 1`
    );
  }
  const [equityAccount] = equityAccounts;
  return [
    {
      ledgerAccountId: ledgerAccount.id,
      currencyCode: bankAccount.currencyCode,
      stockId: bankAccount.stockId,
      amountNanos,
    },
    {
      ledgerAccountId: equityAccount.id,
      currencyCode: bankAccount.currencyCode,
      stockId: bankAccount.stockId,
      amountNanos: -amountNanos,
    },
  ];
}

async function syncOpeningBalance(
  tx: Prisma.TransactionClient,
  userId: number,
  bankAccount: BankAccount,
  ledgerAccount: LedgerAccountV2,
  amountNanos: bigint
) {
  const lines = await makeOpeningBalanceLines(
    tx,
    userId,
    bankAccount,
    ledgerAccount,
    amountNanos
  );
  // Find the existing opening balance for this account (the current version).
  const existing = await tx.transactionV2.findMany({
    where: {
      userId,
      type: 'OPENING_BALANCE',
      lines: {some: {ledgerAccountId: ledgerAccount.id}},
    },
  });
  if (!existing.length && amountNanos == BigInt(0)) {
    // no opening balance before and after - nothing to do
    return;
  }
  let iid: number;
  let supersedesId: number | null;
  if (!existing.length) {
    // no opening balance before, need to set new one.
    const maxIid = await tx.transactionV2.aggregate({
      where: {userId},
      _max: {iid: true},
    });
    iid = (maxIid._max.iid ?? 0) + 1;
    supersedesId = null;
  } else {
    // TODO: bail here if there is no change in the opening balance.
    // have existing opening balance, need to correct it.
    const latest = latestVersionOnly(existing);
    if (latest.length != 1) {
      throw new Error(
        `Want 1 opening balance, but got ${latest.length} for user ${userId}`
      );
    }
    const [previous] = latest;
    iid = previous.iid;
    supersedesId = previous.id;
  }
  await tx.transactionV2.create({
    data: {
      iid,
      userId,
      timestamp: new Date(),
      type: 'OPENING_BALANCE',
      ...(lines.length ? {lines: {create: lines}} : {}),
      ...(supersedesId ? {supersedesId} : {}),
    },
  });
}
