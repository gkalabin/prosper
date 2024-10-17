import {fillUnitData} from '@/app/api/config/bank-account/fillUnitData';
import {DB} from '@/lib/db';
import {UpdateBankAccountRequest} from '@/lib/form-types/BankAccountFormValues';
import prisma from '@/lib/prisma';
import {getUserId} from '@/lib/user';
import {positiveIntOrNull} from '@/lib/util/searchParams';
import {NextRequest, NextResponse} from 'next/server';

export async function PUT(
  request: NextRequest,
  {params}: {params: {accountId: string}}
): Promise<Response> {
  const accountId = positiveIntOrNull(params.accountId);
  if (!accountId) {
    return new Response(`accountId must be an integer`, {status: 400});
  }
  const {name, displayOrder, unit, isArchived, isJoint, initialBalance} =
    (await request.json()) as UpdateBankAccountRequest;
  const userId = await getUserId();
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
  return NextResponse.json(result);
}
