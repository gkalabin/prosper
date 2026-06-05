import {Button} from '@/components/ui/button';
import {
  AccountTransactions,
  FetchNowResponse,
  GetOpenBankingTransactionsResponse,
} from '@/lib/grpc/gen/prosper/v1/openbanking';
import {formatDistanceToNow} from 'date-fns';
import {useState} from 'react';
import {mutate} from 'swr';

// mergeFetchedTransactions folds a successful fetch result into the cached
// transactions, replacing the account's stored set.
function mergeFetchedTransactions(
  current: GetOpenBankingTransactionsResponse | undefined,
  result: AccountTransactions
): GetOpenBankingTransactionsResponse {
  const byAccount = new Map<number, AccountTransactions>();
  for (const acc of current?.accounts ?? []) {
    byAccount.set(acc.internalAccountId, acc);
  }
  byAccount.set(result.internalAccountId, result);
  return {accounts: [...byAccount.values()]};
}

// FetchOpenBankingTransactions shows how stale the account's stored open
// banking data is and triggers an immediate fetch of that account, updating the
// suggestion list from the fetched transactions when done.
export function FetchOpenBankingTransactions({
  internalAccountId,
  lastFetchedAt,
  disabled,
}: {
  internalAccountId: number;
  lastFetchedAt: number | null;
  disabled: boolean;
}) {
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onClick = async () => {
    setFetching(true);
    setError(null);
    try {
      const res = await fetch('/api/open-banking/fetch', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({internalAccountId}),
      });
      if (!res.ok) {
        throw new Error(`Fetch failed with status ${res.status}`);
      }
      const result = FetchNowResponse.fromJson(await res.json()).result;
      if (!result || result.error) {
        throw new Error(result?.error || 'Fetch returned no transactions');
      }
      await mutate<GetOpenBankingTransactionsResponse>(
        '/api/open-banking/transactions',
        current => mergeFetchedTransactions(current, result),
        {revalidate: false}
      );
    } catch (e) {
      setError(`Failed to fetch transactions: ${e}`);
    } finally {
      setFetching(false);
    }
  };
  return (
    <>
      {lastFetchedAt
        ? `Transactions fetched ${formatDistanceToNow(lastFetchedAt)} ago`
        : 'Transactions not fetched yet'}
      {'. '}
      <Button
        variant="link"
        size="inherit"
        onClick={onClick}
        disabled={disabled || fetching}
      >
        {fetching ? 'Fetching…' : 'Fetch now'}
      </Button>
      {error && <span className="text-destructive font-medium"> {error}</span>}
    </>
  );
}
