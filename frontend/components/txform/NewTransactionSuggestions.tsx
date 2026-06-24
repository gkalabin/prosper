import {FetchOpenBankingTransactions} from '@/components/txform/FetchOpenBankingTransactions';
import {Button} from '@/components/ui/button';
import {AmountWithUnit} from '@/lib/AmountWithUnit';
import {assertDefined} from '@/lib/assert';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {useTransactionDataContext} from '@/lib/context/TransactionDataContext';
import {
  FormType,
  SuggestResponse,
  TransactionDraft,
} from '@/lib/grpc/gen/prosper/v1/ledger';
import {timestampToEpoch} from '@/lib/grpc/timestamp';
import {useDisplayBankAccounts} from '@/lib/model/AppDataModel';
import {
  Bank,
  BankAccount,
  accountUnit,
  fullAccountName,
} from '@/lib/model/BankAccount';
import {
  Transaction,
  otherPartyNameOrNull,
} from '@/lib/model/transaction/Transaction';
import {
  incomingBankAccount,
  outgoingBankAccount,
} from '@/lib/model/transaction/Transfer';
import {useOpenBankingLastFetched} from '@/lib/openbanking/context';
import {
  winnerId,
  winnerMoneyNanos,
  winnerString,
  winnerTimestamp,
} from '@/lib/txsuggestions/candidate';
import {draftFormType, isRecorded, sameEvent} from '@/lib/txsuggestions/draft';
import {cn} from '@/lib/utils';
import {format} from 'date-fns';
import {useMemo, useState} from 'react';
import useSWR from 'swr';

// useSuggestedDrafts loads the transaction drafts the backend proposes
// for events it knows about (e.g. open banking transactions).
function useSuggestedDrafts() {
  const fetcher = (url: string) =>
    fetch(url)
      .then(r => r.json())
      .then(json => SuggestResponse.fromJson(json));
  const {data, error, isLoading} = useSWR<SuggestResponse>(
    '/api/suggest',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );
  return {
    drafts: data?.drafts,
    isLoading,
    isError: !!error,
  };
}

export const NewTransactionSuggestions = (props: {
  activeDraft: TransactionDraft | null;
  onItemClick: (draft: TransactionDraft) => void;
  disabled: boolean;
}) => {
  const {drafts, isError, isLoading} = useSuggestedDrafts();
  if (isError) {
    return (
      <div className="text-red-900">Error loading transaction suggestions</div>
    );
  }
  if (isLoading) {
    return <div>Loading transaction suggestions...</div>;
  }
  if (!drafts?.length) {
    return <></>;
  }
  return <NonEmptyNewTransactionSuggestions {...props} drafts={drafts} />;
};

function draftTimestampEpoch(draft: TransactionDraft): number {
  const timestamp = winnerTimestamp(draft.timestamp);
  return timestamp ? timestampToEpoch(timestamp) : 0;
}

// groupDraftsByAccountId indexes drafts by each account they belong to, so a
// draft touching two accounts (e.g. a transfer) appears under both.
function groupDraftsByAccountId(
  drafts: TransactionDraft[]
): Map<number, TransactionDraft[]> {
  const byAccount = new Map<number, TransactionDraft[]>();
  const append = (accountId: number, draft: TransactionDraft) => {
    const accountDrafts = byAccount.get(accountId) ?? [];
    byAccount.set(accountId, [...accountDrafts, draft]);
  };
  for (const draft of drafts) {
    const accountFromId = winnerId(draft.accountFromId);
    if (accountFromId) {
      append(accountFromId, draft);
    }
    const accountToId = winnerId(draft.accountToId);
    if (accountToId) {
      append(accountToId, draft);
    }
  }
  return byAccount;
}

const NonEmptyNewTransactionSuggestions = (props: {
  drafts: TransactionDraft[];
  activeDraft: TransactionDraft | null;
  onItemClick: (draft: TransactionDraft) => void;
  disabled: boolean;
}) => {
  const {banks} = useCoreDataContext();
  const {lastFetchedAt} = useOpenBankingLastFetched();
  const bankAccounts = useDisplayBankAccounts();
  // Derive the grouping and the account list only when the drafts or accounts
  // change, not on every re-render driven by local state (e.g. switching the
  // active account tab below).
  const draftsByAccountId = useMemo(
    () => groupDraftsByAccountId(props.drafts),
    [props.drafts]
  );
  const accountsWithData = useMemo(
    () => bankAccounts.filter(a => draftsByAccountId.get(a.id)?.length),
    [bankAccounts, draftsByAccountId]
  );
  const [activeAccountId, setActiveAccountId] = useState<number | null>(null);
  const activeAccount =
    accountsWithData.find(a => a.id == activeAccountId) ??
    accountsWithData[0] ??
    null;
  if (!activeAccount) {
    return <></>;
  }
  const activeAccountDrafts = draftsByAccountId.get(activeAccount.id) ?? [];
  return (
    <div className="divide-y divide-gray-200 rounded border border-gray-200">
      <div>
        <h1 className="-mb-1 ml-2 text-xl font-medium">Suggestions</h1>
        <small className="ml-2 text-slate-600">
          Use the suggestions below to pre-fill the form
        </small>
        <div className="space-x-2">
          {accountsWithData.map(account => (
            <div key={account.id} className="ml-2 inline-block">
              <Button
                variant="link"
                size="inherit"
                onClick={() => setActiveAccountId(account.id)}
                disabled={props.disabled || account.id == activeAccount.id}
              >
                {fullAccountName(account, banks)}
              </Button>
            </div>
          ))}
        </div>
      </div>
      <SuggestionsList
        items={activeAccountDrafts}
        activeDraft={props.activeDraft}
        onItemClick={props.onItemClick}
        bankAccount={activeAccount}
        lastFetchedAt={lastFetchedAt[activeAccount.id] ?? null}
        disabled={props.disabled}
      />
    </div>
  );
};

function SuggestionsList(props: {
  items: TransactionDraft[];
  bankAccount: BankAccount;
  lastFetchedAt: number | null;
  activeDraft: TransactionDraft | null;
  onItemClick: (draft: TransactionDraft) => void;
  disabled: boolean;
}) {
  const items = [...props.items].sort(
    (a, b) => draftTimestampEpoch(b) - draftTimestampEpoch(a)
  );
  const [limit, setLimit] = useState(5);
  const displayItems = items.slice(0, limit);
  return (
    <div className="divide-y divide-gray-200">
      {displayItems.map(draft => (
        <SuggestionItem
          key={draft.origins.map(o => `${o.kind}:${o.key}`).join(',')}
          draft={draft}
          isActive={!!props.activeDraft && sameEvent(draft, props.activeDraft)}
          bankAccount={props.bankAccount}
          onClick={props.onItemClick}
          disabled={props.disabled}
        />
      ))}
      <div className="p-2 text-sm">
        Showing {displayItems.length} out of {items.length} items.
        <br />
        Display{' '}
        <Button
          variant="link"
          size="inherit"
          onClick={() => setLimit(Math.min(limit + 5, items.length))}
          disabled={props.disabled || limit >= items.length}
        >
          more
        </Button>
        {' or '}
        <Button
          variant="link"
          size="inherit"
          onClick={() => setLimit(limit - 5)}
          disabled={props.disabled || displayItems.length <= 5}
        >
          less
        </Button>{' '}
        entries.
        <div className="mt-2 text-xs text-gray-500">
          <FetchOpenBankingTransactions
            internalAccountId={props.bankAccount.id}
            lastFetchedAt={props.lastFetchedAt}
            disabled={props.disabled}
          />
        </div>
      </div>
    </div>
  );
}

function summary(
  t: Transaction,
  bankAccounts: BankAccount[],
  banks: Bank[]
): string {
  switch (t.kind) {
    case 'PersonalExpense':
      return `${t.vendor} ${
        otherPartyNameOrNull(t) ? 'split with ' + otherPartyNameOrNull(t) : ''
      }`;
    case 'ThirdPartyExpense':
      return `${t.vendor} paid by ${t.payer}`;
    case 'Income':
      return `${t.payer} ${
        otherPartyNameOrNull(t) ? 'split with ' + otherPartyNameOrNull(t) : ''
      }`;
    case 'Transfer':
      const from = outgoingBankAccount(t, bankAccounts);
      const to = incomingBankAccount(t, bankAccounts);
      return `${fullAccountName(from, banks)} → ${fullAccountName(to, banks)}`;
    case 'OpeningBalance':
      throw new Error(
        `Opening balance transaction cannot be linked, but found ${t.id}`
      );
    default:
      const _exhaustiveCheck: never = t;
      throw new Error(`Unknown transaction type for ${_exhaustiveCheck}`);
  }
}

// draftTitle is the suggestion row's headline: the name the draft
// proposes for the field the form will show it in.
function draftTitle(draft: TransactionDraft): string {
  switch (draftFormType(draft)) {
    case FormType.INCOME:
      return winnerString(draft.payer, '');
    case FormType.TRANSFER:
      return winnerString(draft.description, '');
    default:
      return winnerString(draft.vendor, '');
  }
}

// signedAmountForAccountNanos returns the draft's amount relative to one of
// its accounts: positive when money enters the account, negative when it leaves.
function signedAmountForAccountNanos(
  draft: TransactionDraft,
  accountId: number
): bigint {
  const formType = draftFormType(draft);
  switch (formType) {
    case FormType.INCOME:
      // Income is deposited into the account.
      return winnerMoneyNanos(draft.amount, 0n);
    case FormType.EXPENSE:
      // An expense is paid out of the account.
      return -winnerMoneyNanos(draft.amount, 0n);
    case FormType.TRANSFER: {
      // A transfer credits the receiving account the amount received and
      // debits the sending account the amount sent.
      if (winnerId(draft.accountToId) == accountId) {
        const receivedNanos = winnerMoneyNanos(draft.amountReceived);
        assertDefined(receivedNanos);
        return receivedNanos;
      }
      return -winnerMoneyNanos(draft.amount, 0n);
    }
    default:
      throw new Error(`Cannot compute signed amount for form type ${formType}`);
  }
}

function SuggestionItem({
  draft,
  isActive,
  bankAccount,
  onClick,
  disabled,
}: {
  draft: TransactionDraft;
  isActive: boolean;
  bankAccount: BankAccount;
  onClick: (draft: TransactionDraft) => void;
  disabled: boolean;
}) {
  const {transactions} = useTransactionDataContext();
  const {banks, bankAccounts, stocks} = useCoreDataContext();
  const recordedTransaction = transactions.find(
    t => t.id == draft.recordedTransactionIds[0]
  );
  const handleClick = () => {
    if (disabled) {
      return;
    }
    onClick(draft);
  };
  const isTransfer = draftFormType(draft) == FormType.TRANSFER;
  const otherAccountId = !isTransfer
    ? null
    : winnerId(draft.accountToId) == bankAccount.id
      ? winnerId(draft.accountFromId, null)
      : winnerId(draft.accountToId, null);
  const otherAccount = bankAccounts.find(a => a.id == otherAccountId);
  const amountNanos = signedAmountForAccountNanos(draft, bankAccount.id);
  const unit = accountUnit(bankAccount, stocks);
  const signedAmount = new AmountWithUnit({amountNanos, unit});
  const timestampEpoch = draftTimestampEpoch(draft);
  return (
    <div className={cn({'bg-gray-100': isActive})}>
      <div className="flex px-2 py-1">
        <div
          className={cn('flex grow cursor-pointer', {
            'text-slate-500': isActive,
            'opacity-25': isRecorded(draft),
          })}
          onClick={handleClick}
        >
          <div className="grow">
            <div>{draftTitle(draft)}</div>
            {isTransfer && otherAccount && (
              <div className="text-xs italic text-gray-600">
                Transfer {signedAmount.isPositive() ? 'from' : 'to'}{' '}
                {fullAccountName(otherAccount, banks)}
              </div>
            )}
            {timestampEpoch > 0 && (
              <div className="text-xs text-gray-600">
                {format(timestampEpoch, 'yyyy-MM-dd HH:mm')}
              </div>
            )}
          </div>

          <div
            className={cn('self-center pr-2 text-lg', {
              'text-green-900': signedAmount.isPositive(),
            })}
          >
            {signedAmount.format({signDisplay: 'exceptZero'})}
          </div>
        </div>
      </div>
      {recordedTransaction && (
        <div className="ml-2 text-xs text-gray-600">
          Recorded as <i>{summary(recordedTransaction, bankAccounts, banks)}</i>
        </div>
      )}
    </div>
  );
}
