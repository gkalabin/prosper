import {DEFAULT_AUTHENTICATED_PAGE} from '@/lib/auth/const';
import {getAuthContextOrRedirect} from '@/lib/auth/user';
import {withAuth} from '@/lib/grpc/auth';
import {openBankingClient} from '@/lib/grpc/client';
import {logApi} from '@/lib/util/log';
import {positiveIntOrNull} from '@/lib/util/searchParams';
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
  const auth = await getAuthContextOrRedirect();
  logApi('POST', '/api/open-banking/starling/connect', {
    userId: auth.userId,
    bankId,
  });
  const {response} = await openBankingClient.setStarlingToken(
    withAuth({bankId, accessToken: token}, auth)
  );
  return redirect(
    response.wasReconnect
      ? DEFAULT_AUTHENTICATED_PAGE
      : `/config/open-banking/mapping?bankId=${bankId}`
  );
}
