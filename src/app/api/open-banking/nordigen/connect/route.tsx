import {getUserIdOrRedirect} from '@/lib/auth/user';
import {DB} from '@/lib/db';
import {getOrCreateToken} from '@/lib/openbanking/nordigen/token';
import prisma from '@/lib/prisma';
import {positiveIntOrNull} from '@/lib/util/searchParams';
import {redirect} from 'next/navigation';
import {NextRequest} from 'next/server';
import {v4 as uuidv4} from 'uuid';

export async function GET(request: NextRequest): Promise<Response> {
  const query = request.nextUrl.searchParams;
  const bankId = positiveIntOrNull(query.get('bankId'));
  if (!bankId) {
    return new Response(`bankId must be an integer`, {status: 400});
  }
  const institutionId = query.get('institutionId');
  if (!institutionId) {
    return new Response(`institutionId is missing`, {status: 400});
  }
  const redirectURI = `${process.env.PUBLIC_APP_URL}/api/open-banking/nordigen/connected`;
  const userId = await getUserIdOrRedirect();
  const db = new DB({userId});
  const [bank] = await db.bankFindMany({where: {id: bankId}});
  if (!bank) {
    return new Response(`Bank not found`, {status: 404});
  }
  const reference = uuidv4();
  const token = await getOrCreateToken(db, bankId);
  const response = await fetch(
    `https://bankaccountdata.gocardless.com/api/v2/requisitions/`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.access}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        redirect: redirectURI,
        institution_id: institutionId,
        reference,
      }),
    }
  );
  if (Math.round(response.status / 100) * 100 !== 200) {
    return new Response(
      `Failed to create requisition (status ${
        response.status
      }): ${await response.text()}`,
      {status: 500}
    );
  }
  const requisition = await response.json();
  const data = {
    id: reference,
    requisitionId: requisition.id,
    institutionId,
    userId,
    bankId,
  };
  await prisma.nordigenRequisition.upsert({
    create: data,
    update: data,
    where: {
      bankId,
    },
  });
  return redirect(requisition.link);
}
