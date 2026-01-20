'use server';
import {getUserIdOrRedirect} from '@/lib/auth/user';
import {DB} from '@/lib/db';
import {fillUnitData} from '@/lib/db/bank-account';
import {updateCoreDataCache} from '@/lib/db/cache';
import {
  AccountFormSchema,
  accountFormValidationSchema,
} from '@/lib/form-types/AccountFormSchema';
import prisma from '@/lib/prisma';
import {dollarToCents} from '@/lib/util/util';
import {BankAccount} from '@prisma/client';
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

  if (!accountId) {
    // Create new account
    await fillUnitData(unit, data);
    const result = await prisma.bankAccount.create({data});
    await updateCoreDataCache(userId);
    return {status: 'SUCCESS', data: result};
  }
  // Update existing account
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
  await fillUnitData(unit, data);
  const result = await prisma.bankAccount.update({
    data,
    where: {id: accountId},
  });
  await updateCoreDataCache(userId);
  return {status: 'SUCCESS', data: result};
}
