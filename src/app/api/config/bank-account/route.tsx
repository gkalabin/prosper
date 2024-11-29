import {
  getOrCreateUnitId,
  setUnitData,
} from '@/app/api/config/bank-account/unit';
import {getUserIdOrRedirect} from '@/lib/auth/user';
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
  // This is a helper function, run it outside the main transaction.
  const unitId = await getOrCreateUnitId(unit);
  const result = await prisma.$transaction(async tx => {
    const iid = (await tx.bankAccount.count({where: {userId}})) + 1;
    const data: Prisma.BankAccountUncheckedCreateInput = {
      iid,
      name,
      displayOrder,
      bankId,
      userId,
      joint: isJoint,
      initialBalanceCents: Math.round(initialBalance * 100),
    };
    setUnitData(unitId, data);
    return await prisma.bankAccount.create({data});
  });
  return NextResponse.json(result);
}
