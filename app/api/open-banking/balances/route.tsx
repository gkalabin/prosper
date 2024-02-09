import {DB} from '@/lib/db';
import {fetchBalances, getExpirations} from '@/lib/openbanking/fetchall';
import {
  AccountBalance,
  ConnectionExpiration,
} from '@/lib/openbanking/interface';
import {getUserId} from '@/lib/user';
import {NextResponse} from 'next/server';

export interface OpenBankingBalances {
  balances: AccountBalance[];
  expirations: ConnectionExpiration[];
}

export async function GET(): Promise<Response> {
  const userId = await getUserId();
  const db = new DB({userId});
  const result: OpenBankingBalances = {
    balances: await fetchBalances(db),
    expirations: await getExpirations(db),
  };
  return NextResponse.json(result);
}
