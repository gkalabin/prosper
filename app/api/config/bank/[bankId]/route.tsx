import {DB} from 'lib/db';
import {UpdateBankRequest} from 'lib/model/forms/BankFormValues';
import {getUserId} from 'lib/user';
import {intParam} from 'lib/util/searchParams';
import {NextRequest, NextResponse} from 'next/server';

export async function PUT(
  request: NextRequest,
  {params}: {params: {bankId: string}}
): Promise<Response> {
  const bankId = intParam(params.bankId);
  if (!bankId) {
    return new Response(`bankId must be an integer`, {status: 400});
  }
  const {name, displayOrder} = (await request.json()) as UpdateBankRequest;
  const userId = await getUserId();
  // Verify user has access.
  const db = new DB({userId});
  const found = await db.bankFindMany({
    where: {
      id: bankId,
    },
  });
  if (!found?.length) {
    return new Response(`Not authenticated`, {status: 401});
  }
  // Perform update.
  const result = await db.bankUpdate({
    data: {name, displayOrder},
    where: {id: bankId},
  });
  return NextResponse.json(result);
}
