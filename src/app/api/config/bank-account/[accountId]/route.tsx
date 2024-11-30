import {fillUnitData} from '@/app/api/config/bank-account/fillUnitData';
import {getUserIdOrRedirect} from '@/lib/auth/user';
import {DB, invalidateCache} from '@/lib/db';
import {accountFormValidationSchema} from '@/lib/form-types/AccountFormSchema';
import prisma from '@/lib/prisma';
import {positiveIntOrNull} from '@/lib/util/searchParams';
import {NextRequest, NextResponse} from 'next/server';

export async function PUT(
  request: NextRequest,
  {params}: {params: {accountId: string}}
): Promise<Response> {
  const userId = await getUserIdOrRedirect();
  const accountId = positiveIntOrNull(params.accountId);
  if (!accountId) {
    return new Response(`accountId must be an integer`, {status: 400});
  }
  const validatedData = accountFormValidationSchema.safeParse(
    await request.json()
  );
  if (!validatedData.success) {
    return new Response(`Invalid form`, {
      status: 400,
    });
  }
  const {name, displayOrder, unit, isJoint, isArchived, initialBalance} =
    validatedData.data;
  // Verify user has access.
  const db = new DB({userId});
  const found = await db.bankAccountFindMany({
    where: {
      id: accountId,
    },
  });
  if (!found?.length) {
    return new Response(`Not authenticated`, {status: 401});
  }
  // Perform update.
  const data = {
    name,
    displayOrder,
    archived: isArchived,
    joint: isJoint,
    initialBalanceCents: Math.round(initialBalance * 100),
  };
  await fillUnitData(unit, data);
  const result = await prisma.bankAccount.update({
    data: data,
    where: {id: accountId},
  });
  await invalidateCache(userId);
  return NextResponse.json(result);
}
