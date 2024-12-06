import {fillUnitData} from '@/app/api/config/bank-account/fillUnitData';
import {getUserIdOrRedirect} from '@/lib/auth/user';
import {invalidateCoreDataCache} from '@/lib/db/cache';
import {accountFormValidationSchema} from '@/lib/form-types/AccountFormSchema';
import prisma from '@/lib/prisma';
import {Prisma} from '@prisma/client';
import {NextRequest, NextResponse} from 'next/server';

export async function POST(request: NextRequest): Promise<Response> {
  const userId = await getUserIdOrRedirect();
  const validatedData = accountFormValidationSchema.safeParse(
    await request.json()
  );
  if (!validatedData.success) {
    return new Response(`Invalid form`, {
      status: 400,
    });
  }
  const {name, displayOrder, bankId, unit, isJoint, initialBalance} =
    validatedData.data;
  const data: Prisma.BankAccountUncheckedCreateInput = {
    name,
    displayOrder,
    bankId,
    userId,
    joint: isJoint,
    initialBalanceCents: Math.round(initialBalance * 100),
  };
  await fillUnitData(unit, data);
  const result = await prisma.bankAccount.create({
    data: data,
  });
  await invalidateCoreDataCache(userId);
  return NextResponse.json(result);
}
