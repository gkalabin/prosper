import {DB} from 'lib/db';
import {fetchTransactions} from 'lib/openbanking/fetchall';
import {WithdrawalOrDepositPrototype} from 'lib/txsuggestions/TransactionPrototype';
import {getUserId} from 'lib/user';
import {NextResponse} from 'next/server';

export interface OpenBankingTransactions {
  transactions: WithdrawalOrDepositPrototype[];
}

export async function GET(): Promise<Response> {
  const userId = await getUserId();
  const db = new DB({userId});
  const result: OpenBankingTransactions = {
    transactions: await fetchTransactions(db),
  };
  return NextResponse.json(result);
}
