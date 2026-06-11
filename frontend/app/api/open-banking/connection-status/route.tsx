import {getAuthContextOrRedirect} from '@/lib/auth/user';
import {withAuth} from '@/lib/grpc/auth';
import {openBankingClient} from '@/lib/grpc/client';
import {GetConnectionStatusResponse} from '@/lib/grpc/gen/prosper/v1/openbanking';
import {logApi} from '@/lib/util/log';
import {NextResponse} from 'next/server';

export async function GET(): Promise<Response> {
  const auth = await getAuthContextOrRedirect();
  logApi('GET', '/api/open-banking/connection-status', {userId: auth.userId});
  const {response} = await openBankingClient.getConnectionStatus(
    withAuth({}, auth)
  );
  return NextResponse.json(GetConnectionStatusResponse.toJson(response));
}
