import {getAuthContextOrRedirect} from '@/lib/auth/user';
import {withAuth} from '@/lib/grpc/auth';
import {openBankingClient} from '@/lib/grpc/client';
import {timestampToEpoch} from '@/lib/grpc/timestamp';
import {
  WithdrawalOrDepositPrototype,
  fromOpenBankingTransaction,
} from '@/lib/txsuggestions/TransactionPrototype';
import {logApi} from '@/lib/util/log';
import {nanosToCents} from '@/lib/util/util';
import {NextResponse} from 'next/server';

export interface OpenBankingTransactions {
  transactions: WithdrawalOrDepositPrototype[];
}

export async function GET(): Promise<Response> {
  const auth = await getAuthContextOrRedirect();
  logApi('GET', '/api/open-banking/transactions', {userId: auth.userId});
  const {response} = await openBankingClient.getOpenBankingTransactions(
    withAuth({}, auth)
  );
  const flat = response.accounts.flatMap(acc =>
    acc.transactions.map(t =>
      fromOpenBankingTransaction({
        externalTransactionId: t.externalTransactionId,
        timestampEpoch: timestampToEpoch(t.timestamp),
        description: t.description,
        amountCents: nanosToCents(t.signedAmountNanos),
        internalAccountId: acc.internalAccountId,
      })
    )
  );
  const result: OpenBankingTransactions = {transactions: flat};
  return NextResponse.json(result);
}
