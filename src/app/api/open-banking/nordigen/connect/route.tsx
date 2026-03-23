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
  logApi('GET', '/api/open-banking/nordigen/connect', {
    userId: auth.userId,
    bankId,
    institutionId,
  });
  const redirectURI = `${process.env.PUBLIC_APP_URL}/api/open-banking/nordigen/connected`;
  const {response} = await openBankingClient.startNordigenConnection(
    withAuth({bankId, institutionId, redirectUri: redirectURI}, auth)
  );
  return redirect(response.authUrl);
}
