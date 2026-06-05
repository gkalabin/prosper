import {getAuthContextOrRedirect} from '@/lib/auth/user';
import {withAuth} from '@/lib/grpc/auth';
import {openBankingClient} from '@/lib/grpc/client';
import {FetchNowResponse} from '@/lib/grpc/gen/prosper/v1/openbanking';
import {logApi} from '@/lib/util/log';
import {NextResponse} from 'next/server';

export async function POST(request: Request): Promise<Response> {
  const auth = await getAuthContextOrRedirect();
  logApi('POST', '/api/open-banking/fetch', {userId: auth.userId});
  const {internalAccountId} = await request.json();
  const {response} = await openBankingClient.fetchNow(
    withAuth({internalAccountId}, auth)
  );
  return NextResponse.json(FetchNowResponse.toJson(response));
}
