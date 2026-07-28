import {getAuthContextOrRedirect} from '@/lib/auth/user';
import {withAuth} from '@/lib/grpc/auth';
import {openBankingClient} from '@/lib/grpc/client';
import {logApi} from '@/lib/util/log';
import {positiveIntOrNull} from '@/lib/util/searchParams';
import {redirect} from 'next/navigation';
import {NextRequest} from 'next/server';

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
  const auth = await getAuthContextOrRedirect();
  logApi('GET', '/api/open-banking/gocardless/connect', {
    userId: auth.userId,
    bankId,
    institutionId,
  });
  const result = await openBankingClient
    .startGoCardlessConnection(withAuth({bankId, institutionId}, auth))
    .then(({response}) => ({ok: true, authUrl: response.authUrl}) as const)
    .catch(err => ({ok: false, err}) as const);
  if (!result.ok) {
    return new Response(`Open banking api error: ${result.err}`, {status: 500});
  }
  return redirect(result.authUrl);
}
