'use server';
import {getUserIdOrRedirect} from '@/lib/auth/user';
import {DB} from '@/lib/db';
import {updateCoreDataCache} from '@/lib/db/cache';
import {
  BankFormSchema,
  bankFormValidationSchema,
} from '@/lib/form-types/BankFormSchema';
import prisma from '@/lib/prisma';
import {Bank} from '@prisma/client';
import {type typeToFlattenedError} from 'zod';

export type UpsertBankResult =
  | {
      status: 'SUCCESS';
      data: Bank;
    }
  | {
      status: 'CLIENT_ERROR';
      errors: typeToFlattenedError<BankFormSchema>;
    };

export async function upsertBank(
  bankId: number | null,
  unsafeData: BankFormSchema
): Promise<UpsertBankResult> {
  const userId = await getUserIdOrRedirect();
  const validatedData = bankFormValidationSchema.safeParse(unsafeData);
  if (!validatedData.success) {
    return {
      status: 'CLIENT_ERROR',
      errors: validatedData.error.flatten(),
    };
  }
  const {name, displayOrder} = validatedData.data;

  if (!bankId) {
    // Create new bank
    const result = await prisma.bank.create({
      data: {
        name,
        displayOrder,
        user: {
          connect: {
            id: userId,
          },
        },
      },
    });
    await updateCoreDataCache(userId);
    return {status: 'SUCCESS', data: result};
  }

  // Update existing bank
  const db = new DB({userId});
  const found = await db.bankFindMany({where: {id: bankId}});
  if (!found?.length) {
    return {
      status: 'CLIENT_ERROR',
      errors: {
        formErrors: [`Bank with id ${bankId} is not found`],
        fieldErrors: {},
      },
    };
  }
  const result = await db.bankUpdate({
    data: {name, displayOrder},
    where: {id: bankId},
  });
  await updateCoreDataCache(userId);
  return {status: 'SUCCESS', data: result};
}
