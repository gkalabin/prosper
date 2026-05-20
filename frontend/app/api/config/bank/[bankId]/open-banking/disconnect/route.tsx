import {getAuthContextOrRedirect} from '@/lib/auth/user';
import {withAuth} from '@/lib/grpc/auth';
import {openBankingClient} from '@/lib/grpc/client';
import {logApi} from '@/lib/util/log';
import {positiveIntOrNull} from '@/lib/util/searchParams';
import {RedirectType, redirect} from 'next/navigation';
import {NextRequest} from 'next/server';

export async function POST(
  _request: NextRequest,
  {params}: {params: Promise<{bankId: string}>}
): Promise<Response> {
  const bankId = positiveIntOrNull((await params).bankId);
  if (!bankId) {
    return new Response(`bankId must be an integer`, {status: 400});
  }
  const auth = await getAuthContextOrRedirect();
  logApi('POST', '/api/config/bank/[bankId]/open-banking/disconnect', {
    userId: auth.userId,
    bankId,
  });
  try {
    await openBankingClient.disconnect(withAuth({bankId}, auth));
  } catch (err) {
    return new Response(`Bank is not connected: ${err}`, {status: 400});
  }
  return redirect('/config/banks', RedirectType.push);
}
