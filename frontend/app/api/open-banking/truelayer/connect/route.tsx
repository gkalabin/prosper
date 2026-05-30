import {DEFAULT_AUTHENTICATED_PAGE} from '@/lib/auth/const';
import {getAuthContextOrRedirect} from '@/lib/auth/user';
import {withAuth} from '@/lib/grpc/auth';
import {openBankingClient} from '@/lib/grpc/client';
import {logApi} from '@/lib/util/log';
import {positiveIntOrNull} from '@/lib/util/searchParams';
import {redirect} from 'next/navigation';
import {NextRequest} from 'next/server';

export async function GET(request: NextRequest): Promise<Response> {
  const auth = await getAuthContextOrRedirect();
  const query = request.nextUrl.searchParams;
  const code = query.get('code');
  if (!code) {
    const connectingBankId = positiveIntOrNull(query.get('bankId'));
    if (!connectingBankId) {
      return new Response(`bankId must be an integer`, {status: 400});
    }
    logApi('GET', '/api/open-banking/truelayer/connect', {
      userId: auth.userId,
      phase: 'start',
      bankId: connectingBankId,
    });
    const {response} = await openBankingClient.startTrueLayerConnection(
      withAuth({bankId: connectingBankId}, auth)
    );
    return redirect(response.authUrl);
  }

  const bankId = positiveIntOrNull(query.get('state'));
  if (!bankId) {
    return new Response(`bankId must be an integer`, {status: 400});
  }
  logApi('GET', '/api/open-banking/truelayer/connect', {
    userId: auth.userId,
    phase: 'complete',
    bankId,
  });
  const result = await openBankingClient
    .completeTrueLayerConnection(withAuth({bankId, code}, auth))
    .then(
      ({response}) => ({ok: true, wasReconnect: response.wasReconnect}) as const
    )
    .catch(err => ({ok: false, err}) as const);
  if (!result.ok) {
    return new Response(`Open banking api error: ${result.err}`, {status: 500});
  }
  return redirect(
    result.wasReconnect
      ? DEFAULT_AUTHENTICATED_PAGE
      : `/config/open-banking/mapping?bankId=${bankId}`
  );
}
