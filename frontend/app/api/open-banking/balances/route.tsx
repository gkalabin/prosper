import {getAuthContextOrRedirect} from '@/lib/auth/user';
import {withAuth} from '@/lib/grpc/auth';
import {openBankingClient} from '@/lib/grpc/client';
import {timestampToEpoch} from '@/lib/grpc/timestamp';
import {logApi} from '@/lib/util/log';
import {nanosToCents} from '@/lib/util/util';
import {NextResponse} from 'next/server';

export interface AccountBalance {
  internalAccountId: number;
  balanceCents: number;
}

export interface ConnectionExpiration {
  bankId: number;
  expirationEpoch: number;
}

export interface OpenBankingBalances {
  balances: AccountBalance[];
  expirations: ConnectionExpiration[];
}

export async function GET(): Promise<Response> {
  const auth = await getAuthContextOrRedirect();
  logApi('GET', '/api/open-banking/balances', {userId: auth.userId});
  const [{response: balances}, {response: status}] = await Promise.all([
    openBankingClient.getBalances(withAuth({}, auth)),
    openBankingClient.getConnectionStatus(withAuth({}, auth)),
  ]);
  const result: OpenBankingBalances = {
    balances: balances.accounts.map(a => ({
      internalAccountId: a.internalAccountId,
      balanceCents: nanosToCents(a.balanceNanos),
    })),
    expirations: status.expirations.map(e => ({
      bankId: e.bankId,
      expirationEpoch: timestampToEpoch(e.expiresAt),
    })),
  };
  return NextResponse.json(result);
}
