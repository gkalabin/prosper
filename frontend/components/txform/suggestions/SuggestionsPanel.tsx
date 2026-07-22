import {FetchOpenBankingTransactions} from '@/components/txform/FetchOpenBankingTransactions';
import {AccountTabs} from '@/components/txform/suggestions/AccountTabs';
import {CollapsedSummary} from '@/components/txform/suggestions/CollapsedSummary';
import {
  draftTimestampEpoch,
  groupDraftsByAccountId,
} from '@/components/txform/suggestions/helpers';
import {SuggestionRow} from '@/components/txform/suggestions/SuggestionRow';
import {AccountFetchMetadata} from '@/lib/grpc/gen/prosper/v1/openbanking';
import {
  SuggestResponse,
  TransactionDraft,
} from '@/lib/grpc/gen/prosper/v1/ledger';
import {useDisplayBankAccounts} from '@/lib/model/AppDataModel';
import {BankAccount} from '@/lib/model/BankAccount';
import {useOpenBankingFetchMetadata} from '@/lib/openbanking/context';
import {winnerId} from '@/lib/txsuggestions/candidate';
import {isRecorded, sameEvent} from '@/lib/txsuggestions/draft';
import {useMemo, useState} from 'react';
import useSWR, {mutate} from 'swr';

const SUGGESTIONS_PAGE_SIZE = 5;

// useSuggestedDrafts loads the transaction drafts the backend proposes for
// events it knows about (e.g. open banking transactions).
function useSuggestedDrafts() {
  const fetcher = (url: string) =>
    fetch(url)
      .then(r => r.json())
      .then(json => SuggestResponse.fromJson(json));
  const {data, error, isLoading} = useSWR<SuggestResponse>(
    '/api/suggest',
    fetcher,
    {revalidateOnFocus: false, revalidateOnReconnect: false}
  );
  return {drafts: data?.drafts, isLoading, isError: !!error};
}

// SuggestionsPanel pairs manual entry with the drafts the backend proposes.
// After a pick it collapses to a one-line summary, reclaiming the viewport for
// the form; the parent owns the collapsed flag so the post-submit loop can
// re-expand it.
export function SuggestionsPanel({
  activeDraft,
  onSelect,
  collapsed,
  setCollapsed,
  disabled,
}: {
  activeDraft: TransactionDraft | null;
  onSelect: (draft: TransactionDraft) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  disabled: boolean;
}) {
  const {drafts, isError, isLoading} = useSuggestedDrafts();
  if (isError) {
    return <ErrorState />;
  }
  if (isLoading) {
    return <LoadingState />;
  }
  if (!drafts?.length) {
    return null;
  }
  if (collapsed && activeDraft) {
    return (
      <CollapsedSummary
        draft={activeDraft}
        onChange={() => setCollapsed(false)}
        disabled={disabled}
      />
    );
  }
  return (
    <ExpandedPanel
      drafts={drafts}
      activeDraft={activeDraft}
      onSelect={onSelect}
      onCollapse={() => setCollapsed(true)}
      disabled={disabled}
    />
  );
}

function accountOfDraft(draft: TransactionDraft): number | null {
  return winnerId(draft.accountFromId) ?? winnerId(draft.accountToId, null);
}

function ExpandedPanel({
  drafts,
  activeDraft,
  onSelect,
  onCollapse,
  disabled,
}: {
  drafts: TransactionDraft[];
  activeDraft: TransactionDraft | null;
  onSelect: (draft: TransactionDraft) => void;
  onCollapse: () => void;
  disabled: boolean;
}) {
  const {metadataByAccount} = useOpenBankingFetchMetadata();
  const bankAccounts = useDisplayBankAccounts();
  const draftsByAccountId = useMemo(
    () => groupDraftsByAccountId(drafts),
    [drafts]
  );
  const accountsWithData = useMemo(
    () => bankAccounts.filter(a => draftsByAccountId.get(a.id)?.length),
    [bankAccounts, draftsByAccountId]
  );
  const [activeAccountId, setActiveAccountId] = useState<number | null>(() =>
    activeDraft ? accountOfDraft(activeDraft) : null
  );
  const activeAccount =
    accountsWithData.find(a => a.id == activeAccountId) ??
    accountsWithData[0] ??
    null;
  if (!activeAccount) {
    return null;
  }
  const pendingCountByAccount = new Map(
    accountsWithData.map(a => [
      a.id,
      (draftsByAccountId.get(a.id) ?? []).filter(d => !isRecorded(d)).length,
    ])
  );
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Suggestions</h2>
          <p className="text-muted-foreground text-sm">
            Tap one to prefill the form below
          </p>
        </div>
        {activeDraft && (
          <button
            type="button"
            onClick={onCollapse}
            disabled={disabled}
            className="text-tint-foreground flex-none text-sm font-semibold disabled:opacity-50"
          >
            Collapse ▲
          </button>
        )}
      </div>
      <AccountTabs
        accounts={accountsWithData}
        activeAccountId={activeAccount.id}
        pendingCountByAccount={pendingCountByAccount}
        onPick={setActiveAccountId}
        disabled={disabled}
      />
      <SuggestionsList
        items={draftsByAccountId.get(activeAccount.id) ?? []}
        activeDraft={activeDraft}
        onItemClick={onSelect}
        bankAccount={activeAccount}
        disabled={disabled}
      />
      <FreshnessRow
        account={activeAccount}
        fetchMetadata={metadataByAccount[activeAccount.id] ?? null}
        disabled={disabled}
      />
    </div>
  );
}

function draftKey(draft: TransactionDraft): string {
  return draft.origins.map(o => `${o.kind}:${o.key}`).join(',');
}

function SuggestionsList({
  items,
  activeDraft,
  onItemClick,
  bankAccount,
  disabled,
}: {
  items: TransactionDraft[];
  activeDraft: TransactionDraft | null;
  onItemClick: (draft: TransactionDraft) => void;
  bankAccount: BankAccount;
  disabled: boolean;
}) {
  const sorted = [...items].sort(
    (a, b) => draftTimestampEpoch(b) - draftTimestampEpoch(a)
  );
  const [limit, setLimit] = useState(SUGGESTIONS_PAGE_SIZE);
  const shown = sorted.slice(0, limit);
  return (
    <div className="border-input bg-card divide-border divide-y overflow-hidden rounded-2xl border">
      {shown.map(draft => (
        <SuggestionRow
          key={draftKey(draft)}
          draft={draft}
          isActive={!!activeDraft && sameEvent(draft, activeDraft)}
          bankAccount={bankAccount}
          onClick={onItemClick}
          disabled={disabled}
        />
      ))}
      <ShowMoreFooter
        shownCount={shown.length}
        totalCount={sorted.length}
        onMore={() =>
          setLimit(l => Math.min(l + SUGGESTIONS_PAGE_SIZE, sorted.length))
        }
        onLess={() => setLimit(SUGGESTIONS_PAGE_SIZE)}
        disabled={disabled}
      />
    </div>
  );
}

function ShowMoreFooter({
  shownCount,
  totalCount,
  onMore,
  onLess,
  disabled,
}: {
  shownCount: number;
  totalCount: number;
  onMore: () => void;
  onLess: () => void;
  disabled: boolean;
}) {
  return (
    <div className="bg-muted/40 flex items-center justify-between gap-2 px-3.5 py-2.5">
      <span className="text-muted-foreground text-xs tabular-nums">
        Showing {shownCount} of {totalCount}
      </span>
      <span className="flex gap-3.5">
        {shownCount < totalCount && (
          <button
            type="button"
            onClick={onMore}
            disabled={disabled}
            className="text-tint-foreground text-xs font-semibold disabled:opacity-50"
          >
            Show more
          </button>
        )}
        {shownCount > SUGGESTIONS_PAGE_SIZE && (
          <button
            type="button"
            onClick={onLess}
            disabled={disabled}
            className="text-muted-foreground text-xs font-semibold disabled:opacity-50"
          >
            Show less
          </button>
        )}
      </span>
    </div>
  );
}

function FreshnessRow({
  account,
  fetchMetadata,
  disabled,
}: {
  account: BankAccount;
  fetchMetadata: AccountFetchMetadata | null;
  disabled: boolean;
}) {
  return (
    <div
      className="text-muted-foreground break-words text-xs"
      data-testid="open-banking-fetch-status"
    >
      <FetchOpenBankingTransactions
        internalAccountId={account.id}
        fetchMetadata={fetchMetadata}
        disabled={disabled}
      />
    </div>
  );
}

function LoadingState() {
  return (
    <div className="border-input bg-card divide-border divide-y overflow-hidden rounded-2xl border">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="flex items-center justify-between px-3.5 py-3.5"
        >
          <div className="flex-1 space-y-2">
            <div className="bg-muted h-3 w-2/5 animate-pulse rounded" />
            <div className="bg-muted h-2.5 w-1/4 animate-pulse rounded opacity-60" />
          </div>
          <div className="bg-muted h-3.5 w-14 animate-pulse rounded" />
        </div>
      ))}
      <div className="text-muted-foreground px-3.5 py-2.5 text-center text-xs">
        Loading transaction suggestions…
      </div>
    </div>
  );
}

function ErrorState() {
  return (
    <div className="border-input bg-card rounded-2xl border p-4 text-center">
      <div className="text-sm font-semibold">
        Couldn&apos;t fetch suggestions
      </div>
      <p className="text-muted-foreground mb-3 mt-0.5 text-xs">
        Check your connection and try again.
      </p>
      <button
        type="button"
        onClick={() => mutate('/api/suggest')}
        className="border-tint-foreground text-tint-foreground rounded-lg border px-4 py-1.5 text-sm font-semibold"
      >
        Retry
      </button>
    </div>
  );
}
