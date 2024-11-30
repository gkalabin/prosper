import {getUserIdOrRedirect} from '@/lib/auth/user';
import {invalidateCache} from '@/lib/db';
import prisma from '@/lib/prisma';
import {positiveIntOrNull} from '@/lib/util/searchParams';
import {addYears} from 'date-fns';
import {redirect} from 'next/navigation';
import {NextRequest} from 'next/server';

export async function POST(request: NextRequest): Promise<Response> {
  const query = request.nextUrl.searchParams;
  const bankId = positiveIntOrNull(query.get('bankId'));
  if (!bankId) {
    return new Response(`bankId must be an integer`, {status: 400});
  }
  const token = (await request.formData()).get('token')?.toString();
  if (!token) {
    return new Response(`token is required`, {status: 400});
  }
  const farFuture = addYears(new Date(), 100).toISOString();
  const userId = await getUserIdOrRedirect();
  await prisma.starlingToken.create({
    data: {
      access: token,
      accessValidUntil: farFuture,
      refresh: '',
      refreshValidUntil: farFuture,
      userId,
      bankId,
    },
  });
  await invalidateCache(userId);
  return redirect(`/config/open-banking/mapping?bankId=${bankId}`);
}
