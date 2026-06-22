import {getAuthContextOrRedirect} from '@/lib/auth/user';
import {withAuth} from '@/lib/grpc/auth';
import {ledgerClient} from '@/lib/grpc/client';
import {SuggestResponse} from '@/lib/grpc/gen/prosper/v1/ledger';
import {logApi} from '@/lib/util/log';
import {NextResponse} from 'next/server';

export async function GET(): Promise<Response> {
  const auth = await getAuthContextOrRedirect();
  logApi('GET', '/api/suggest', {userId: auth.userId});
  const {response} = await ledgerClient.suggest(withAuth({}, auth));
  return NextResponse.json(SuggestResponse.toJson(response));
}
