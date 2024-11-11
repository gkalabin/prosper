import {DB} from '@/lib/db';
import {bankFormValidationSchema} from '@/lib/form-types/BankFormSchema';
import {getUserId} from '@/lib/auth/user';
import {positiveIntOrNull} from '@/lib/util/searchParams';
import {NextRequest, NextResponse} from 'next/server';

export async function PUT(
  request: NextRequest,
  {params}: {params: {bankId: string}}
): Promise<Response> {
  const userId = await getUserId();
  const validatedData = bankFormValidationSchema.safeParse(
    await request.json()
  );
  if (!validatedData.success) {
    return new Response(`Invalid form`, {
      status: 400,
    });
  }
  const {name, displayOrder} = validatedData.data;
  const bankId = positiveIntOrNull(params.bankId);
  if (!bankId) {
    return new Response(`bankId must be an integer`, {status: 400});
  }
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
