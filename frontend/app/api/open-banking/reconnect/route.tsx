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
  const auth = await getAuthContextOrRedirect();
  logApi('GET', '/api/open-banking/reconnect', {userId: auth.userId, bankId});
  try {
    const {response} = await openBankingClient.reconnectInfo(
      withAuth({bankId}, auth)
    );
    return redirect(response.redirectUrl);
  } catch (err) {
    return new Response(`Bank is not connected: ${err}`, {status: 400});
  }
}
