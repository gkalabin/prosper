import {
  ignoreDraftOrigins,
  unignoreDraftOrigins,
} from '@/actions/txform/ignore';
import {
  draftSummary,
  recordedSummary,
} from '@/components/txform/suggestions/summary';
import {TextButton} from '@/components/ui/text-button';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {useTransactionDataContext} from '@/lib/context/TransactionDataContext';
import {FormType, TransactionDraft} from '@/lib/grpc/gen/prosper/v1/ledger';
import {BankAccount, fullAccountName} from '@/lib/model/BankAccount';
import {
  draftFormType,
  draftTimestamp,
  isRecorded,
  signedAmountForAccount,
} from '@/lib/model/transaction/TransactionDraft';
import {winnerId} from '@/lib/txsuggestions/candidate';
import {cn} from '@/lib/utils';
import {format} from 'date-fns';
import {useState} from 'react';
import {mutate} from 'swr';

export function SuggestionRow({
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
  const [isIgnorePending, setIsIgnorePending] = useState(false);
  const recordedTransaction = transactions.find(
    t => t.id == draft.recordedTransactionIds[0]
  );
  const recorded = isRecorded(draft);
  const isDimmed = recorded || draft.ignored;
  const handleIgnoreToggle = async () => {
    setIsIgnorePending(true);
    try {
      if (draft.ignored) {
        await unignoreDraftOrigins(draft.origins);
      } else {
        await ignoreDraftOrigins(draft.origins);
      }
      await mutate('/api/suggest');
    } finally {
      setIsIgnorePending(false);
    }
  };

  const isTransfer = draftFormType(draft) == FormType.TRANSFER;
  const otherAccountId = !isTransfer
    ? null
    : winnerId(draft.accountToId) == bankAccount.id
      ? winnerId(draft.accountFromId, null)
      : winnerId(draft.accountToId, null);
  const otherAccount = bankAccounts.find(a => a.id == otherAccountId);
  const signedAmount = signedAmountForAccount(draft, bankAccount, stocks);

  return (
    <div
      className={cn(
        'relative px-3.5 py-3',
        !disabled && 'hover:bg-muted/50',
        isActive && 'bg-tint',
        isDimmed && 'opacity-60'
      )}
    >
      {isActive && <span className="bg-accent absolute inset-y-0 left-0 w-1" />}
      <button
        type="button"
        onClick={() => onClick(draft)}
        disabled={disabled}
        className="focus-visible:ring-ring flex w-full cursor-pointer flex-col rounded text-left focus-visible:outline-none focus-visible:ring-2 disabled:cursor-default"
      >
        <span className="flex w-full items-start justify-between gap-3">
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <span
              className={cn(
                'truncate text-sm font-semibold',
                isDimmed && 'text-muted-foreground'
              )}
            >
              {draftSummary(draft)}
            </span>
            {isActive && (
              <span className="text-accent bg-accent/15 flex-none rounded px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide">
                Selected
              </span>
            )}
          </span>
          <span
            className={cn(
              'shrink-0 whitespace-nowrap pl-2 font-mono font-medium tabular-nums',
              isDimmed
                ? 'text-muted-foreground'
                : signedAmount.isPositive()
                  ? 'text-up-amount'
                  : 'text-down-amount'
            )}
          >
            {signedAmount.format({signDisplay: 'exceptZero'})}
          </span>
        </span>
        {isTransfer && otherAccount && (
          <span className="text-muted-foreground mt-0.5 block text-xs italic">
            Transfer {signedAmount.isPositive() ? 'from' : 'to'}{' '}
            {fullAccountName(otherAccount, banks)}
          </span>
        )}
        <span className="text-muted-foreground mt-0.5 block font-mono text-xs tabular-nums">
          {format(draftTimestamp(draft), 'yyyy-MM-dd HH:mm')}
        </span>
        {recordedTransaction && (
          <span className="text-muted-foreground mt-1 block text-xs">
            Recorded as{' '}
            <i>{recordedSummary(recordedTransaction, bankAccounts, banks)}</i>
          </span>
        )}
      </button>
      {!recorded && (
        <div className="mt-1.5 text-xs">
          {draft.ignored && (
            <span className="text-muted-foreground italic">Ignored · </span>
          )}
          <TextButton
            type="button"
            tone="accent"
            onClick={handleIgnoreToggle}
            disabled={disabled || isIgnorePending}
          >
            {draft.ignored ? 'Restore' : 'Ignore'}
          </TextButton>
        </div>
      )}
    </div>
  );
}
