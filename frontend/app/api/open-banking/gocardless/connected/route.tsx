import {DEFAULT_AUTHENTICATED_PAGE} from '@/lib/auth/const';
import {getAuthContextOrRedirect} from '@/lib/auth/user';
import {withAuth} from '@/lib/grpc/auth';
import {openBankingClient} from '@/lib/grpc/client';
import {logApi} from '@/lib/util/log';
import {redirect} from 'next/navigation';
import {NextRequest} from 'next/server';

export async function GET(request: NextRequest): Promise<Response> {
  const ref = request.nextUrl.searchParams.get('ref');
  if (!ref) {
    return new Response(`ref is missing`, {status: 400});
  }
  const auth = await getAuthContextOrRedirect();
  logApi('GET', '/api/open-banking/gocardless/connected', {
    userId: auth.userId,
    ref,
  });
  const {response} = await openBankingClient.completeGoCardlessConnection(
    withAuth({reference: ref}, auth)
  );
  return redirect(
    response.wasReconnect
      ? DEFAULT_AUTHENTICATED_PAGE
      : `/config/open-banking/mapping?bankId=${response.bankId}`
  );
}
