import {Button} from '@/components/ui/button';
import {FetchNowResponse} from '@/lib/grpc/gen/prosper/v1/openbanking';
import {formatDistanceToNow} from 'date-fns';
import {useState} from 'react';
import {mutate} from 'swr';

// FetchOpenBankingTransactions shows how stale the account's stored open
// banking data is and triggers an immediate fetch of that account,
// refreshing the suggestion list from the fetched transactions when done.
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
      // The fetch stored new bank transactions: refresh the suggestion
      // drafts built from them and the account's last-fetched time.
      await Promise.all([
        mutate('/api/suggest'),
        mutate('/api/open-banking/fetch-status'),
      ]);
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
