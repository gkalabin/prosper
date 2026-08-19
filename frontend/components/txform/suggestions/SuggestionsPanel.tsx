import {FetchOpenBankingTransactions} from '@/components/txform/FetchOpenBankingTransactions';
import {AccountTabs} from '@/components/txform/suggestions/AccountTabs';
import {CollapsedSummary} from '@/components/txform/suggestions/CollapsedSummary';
import {SuggestionRow} from '@/components/txform/suggestions/SuggestionRow';
import {Button} from '@/components/ui/button';
import {TextButton} from '@/components/ui/text-button';
import {ChevronUpIcon} from '@heroicons/react/24/outline';
import {
  SuggestResponse,
  TransactionDraft,
} from '@/lib/grpc/gen/prosper/v1/ledger';
import {AccountFetchMetadata} from '@/lib/grpc/gen/prosper/v1/openbanking';
import {useDisplayBankAccounts} from '@/lib/model/AppDataModel';
import {BankAccount} from '@/lib/model/BankAccount';
import {
  draftKey,
  draftTimestamp,
  groupDraftsByAccountId,
  isRecorded,
  sameEvent,
} from '@/lib/model/transaction/TransactionDraft';
import {useOpenBankingFetchMetadata} from '@/lib/openbanking/context';
import {Dispatch, ReactNode, SetStateAction, useMemo, useState} from 'react';
import useSWR, {mutate} from 'swr';

const SUGGESTIONS_PAGE_SIZE = 5;

// useSuggestedDrafts loads the transaction drafts the backend proposes.
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

export function SuggestionsPanel({
  activeDraft,
  setActiveDraft,
  collapsed,
  setCollapsed,
  disabled,
}: {
  activeDraft: TransactionDraft | null;
  setActiveDraft: (draft: TransactionDraft) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  disabled: boolean;
}) {
  const {drafts, isError, isLoading} = useSuggestedDrafts();
  // The active account and the number of listed suggestions live here so that
  // collapsing the panel keeps the user's place.
  const [activeAccountId, setActiveAccountId] = useState<number | null>(null);
  const [limit, setLimit] = useState(SUGGESTIONS_PAGE_SIZE);
  if (isError) {
    return (
      <PanelWrapper>
        <ErrorState />
      </PanelWrapper>
    );
  }
  if (isLoading) {
    return (
      <PanelWrapper>
        <LoadingState />
      </PanelWrapper>
    );
  }
  if (!drafts?.length) {
    return null;
  }
  if (collapsed && activeDraft) {
    return (
      <PanelWrapper>
        <CollapsedSummary
          draft={activeDraft}
          onChange={() => setCollapsed(false)}
          disabled={disabled}
        />
      </PanelWrapper>
    );
  }
  return (
    <ExpandedPanel
      drafts={drafts}
      activeDraft={activeDraft}
      setActiveDraft={setActiveDraft}
      onCollapse={() => setCollapsed(true)}
      activeAccountId={activeAccountId}
      setActiveAccountId={setActiveAccountId}
      limit={limit}
      setLimit={setLimit}
      disabled={disabled}
    />
  );
}

function ExpandedPanel({
  drafts,
  activeDraft,
  setActiveDraft,
  onCollapse,
  activeAccountId,
  setActiveAccountId,
  limit,
  setLimit,
  disabled,
}: {
  drafts: TransactionDraft[];
  activeDraft: TransactionDraft | null;
  setActiveDraft: (draft: TransactionDraft) => void;
  onCollapse: () => void;
  activeAccountId: number | null;
  setActiveAccountId: (accountId: number) => void;
  limit: number;
  setLimit: Dispatch<SetStateAction<number>>;
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
  const pendingCountByAccount = useMemo(
    () =>
      new Map(
        accountsWithData.map(a => [
          a.id,
          (draftsByAccountId.get(a.id) ?? []).filter(
            d => !isRecorded(d) && !d.ignored
          ).length,
        ])
      ),
    [accountsWithData, draftsByAccountId]
  );
  if (!accountsWithData.length) {
    // Can happen for archived accounts.
    return null;
  }
  const activeAccount =
    accountsWithData.find(a => a.id == activeAccountId) ?? accountsWithData[0];
  return (
    <PanelWrapper>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Suggestions</h2>
          <p className="text-muted-foreground text-sm">
            Tap one to prefill the form below
          </p>
        </div>
        {activeDraft && (
          <TextButton
            className="flex-none text-sm"
            type="button"
            tone="accent"
            onClick={onCollapse}
            disabled={disabled}
          >
            Collapse
            <ChevronUpIcon />
          </TextButton>
        )}
      </div>
      <AccountTabs
        accounts={accountsWithData}
        activeAccountId={activeAccount.id}
        pendingCountByAccount={pendingCountByAccount}
        setActiveAccountId={setActiveAccountId}
        disabled={disabled}
      />
      <SuggestionsList
        items={draftsByAccountId.get(activeAccount.id) ?? []}
        activeDraft={activeDraft}
        setActiveDraft={setActiveDraft}
        bankAccount={activeAccount}
        limit={limit}
        setLimit={setLimit}
        disabled={disabled}
      />
      <FreshnessRow
        account={activeAccount}
        fetchMetadata={metadataByAccount[activeAccount.id] ?? null}
        disabled={disabled}
      />
    </PanelWrapper>
  );
}

function PanelWrapper({children}: {children: ReactNode}) {
  return <div className="mb-5 space-y-3 border-b pb-5">{children}</div>;
}

function SuggestionsList({
  items,
  activeDraft,
  setActiveDraft,
  bankAccount,
  limit,
  setLimit,
  disabled,
}: {
  items: TransactionDraft[];
  activeDraft: TransactionDraft | null;
  setActiveDraft: (draft: TransactionDraft) => void;
  bankAccount: BankAccount;
  limit: number;
  setLimit: Dispatch<SetStateAction<number>>;
  disabled: boolean;
}) {
  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) => draftTimestamp(b).getTime() - draftTimestamp(a).getTime()
      ),
    [items]
  );
  const shown = sorted.slice(0, limit);
  return (
    <div className="border-input bg-card divide-border divide-y overflow-hidden rounded-2xl border">
      {shown.map(draft => (
        <SuggestionRow
          key={draftKey(draft)}
          draft={draft}
          isActive={!!activeDraft && sameEvent(draft, activeDraft)}
          bankAccount={bankAccount}
          onClick={setActiveDraft}
          disabled={disabled}
        />
      ))}
      <ShowMoreFooter
        shownCount={shown.length}
        totalCount={sorted.length}
        // Paging is shared across accounts, so the limit can exceed the
        // length of this list. Page relative to what is visible.
        onMore={() =>
          setLimit(
            Math.min(shown.length + SUGGESTIONS_PAGE_SIZE, sorted.length)
          )
        }
        onLess={() =>
          setLimit(
            Math.max(
              SUGGESTIONS_PAGE_SIZE,
              shown.length - SUGGESTIONS_PAGE_SIZE
            )
          )
        }
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
    <div className="bg-muted/40 flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs">
      <span className="text-muted-foreground tabular-nums">
        Showing {shownCount} of {totalCount}
      </span>
      <span className="flex gap-3.5">
        {shownCount < totalCount && (
          <TextButton
            type="button"
            tone="accent"
            onClick={onMore}
            disabled={disabled}
          >
            Show more
          </TextButton>
        )}
        {shownCount > SUGGESTIONS_PAGE_SIZE && (
          <TextButton
            type="button"
            tone="muted"
            onClick={onLess}
            disabled={disabled}
          >
            Show less
          </TextButton>
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
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => mutate('/api/suggest')}
      >
        Retry
      </Button>
    </div>
  );
}
