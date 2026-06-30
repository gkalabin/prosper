import {Button} from '@/components/ui/button';
import {AccountFetchMetadata} from '@/lib/grpc/gen/prosper/v1/openbanking';
import {timestampToEpoch} from '@/lib/grpc/timestamp';
import {format, formatDistanceToNow} from 'date-fns';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import {mutate} from 'swr';

// FetchOpenBankingTransactions shows the account's open banking sync state
// and triggers an immediate refresh, rebuilding the suggestion list from
// the fetched transactions when done.
export function FetchOpenBankingTransactions({
  internalAccountId,
  fetchMetadata,
  disabled,
}: {
  internalAccountId: number;
  fetchMetadata: AccountFetchMetadata | null;
  disabled: boolean;
}) {
  const router = useRouter();
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
      // Re-read the server-loaded metadata and refresh the async
      // suggestion drafts built from the stored transactions.
      router.refresh();
      await mutate('/api/suggest');
    } catch (e) {
      setError(`Failed to fetch transactions: ${e}`);
    } finally {
      setFetching(false);
    }
  };
  return (
    <>
      <StatusSummary fetchMetadata={fetchMetadata} />{' '}
      <Button
        variant="link"
        size="inherit"
        onClick={onClick}
        disabled={disabled || fetching}
      >
        {fetching ? 'Refreshing…' : 'Refresh'}
      </Button>
      {error && <span className="text-destructive font-medium"> {error}</span>}
    </>
  );
}

function StatusSummary({
  fetchMetadata,
}: {
  fetchMetadata: AccountFetchMetadata | null;
}) {
  if (!fetchMetadata) {
    return <>Transactions not fetched yet.</>;
  }
  const syncedAt = fetchMetadata.lastSyncSuccessAt;
  const lastSyncedEpoch = syncedAt ? timestampToEpoch(syncedAt) : null;
  if (fetchMetadata.lastSyncError) {
    return (
      <span className="text-destructive">
        Last fetch failed with: {fetchMetadata.lastSyncError}.{' '}
        <span className="text-muted-foreground">
          {lastSyncedEpoch
            ? `Showing transactions from ${format(lastSyncedEpoch, 'yyyy-MM-dd HH:mm')}.`
            : 'No transactions fetched yet.'}
        </span>
      </span>
    );
  }
  if (lastSyncedEpoch) {
    return (
      <>Transactions fetched {formatDistanceToNow(lastSyncedEpoch)} ago.</>
    );
  }
  throw new Error(
    'Impossible state: account has neither a successful sync nor a sync error.'
  );
}
