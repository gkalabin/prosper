import {
  ignoreDraftOrigins,
  unignoreDraftOrigins,
} from '@/actions/txform/ignore';
import {
  draftTimestampEpoch,
  draftTitle,
  recordedSummary,
  signedAmountForAccountNanos,
} from '@/components/txform/suggestions/helpers';
import {AmountWithUnit} from '@/lib/AmountWithUnit';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {useTransactionDataContext} from '@/lib/context/TransactionDataContext';
import {FormType, TransactionDraft} from '@/lib/grpc/gen/prosper/v1/ledger';
import {
  accountUnit,
  BankAccount,
  fullAccountName,
} from '@/lib/model/BankAccount';
import {draftFormType, isRecorded} from '@/lib/txsuggestions/draft';
import {winnerId} from '@/lib/txsuggestions/candidate';
import {cn} from '@/lib/utils';
import {format} from 'date-fns';
import {useState} from 'react';
import {mutate} from 'swr';

// SuggestionRow renders one draft. Tapping it prefills the form and marks the
// row selected in place; recorded and ignored rows dim in place and never
// prefill.
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
  const selectable = !disabled && !isDimmed;

  const handleClick = () => {
    if (!selectable) {
      return;
    }
    onClick(draft);
  };
  const handleIgnoreToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || isIgnorePending) {
      return;
    }
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
  const signedAmount = new AmountWithUnit({
    amountNanos: signedAmountForAccountNanos(draft, bankAccount.id),
    unit: accountUnit(bankAccount, stocks),
  });
  const timestampEpoch = draftTimestampEpoch(draft);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-disabled={!selectable}
      onClick={handleClick}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      className={cn(
        'flex items-start justify-between gap-3 px-3.5 py-3',
        selectable && 'hover:bg-muted/50 cursor-pointer',
        isActive &&
          'bg-tint shadow-[inset_3px_0_0_hsl(var(--tint-foreground))]',
        isDimmed && 'opacity-60'
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'truncate text-sm font-semibold',
              isDimmed && 'text-muted-foreground'
            )}
          >
            {draftTitle(draft)}
          </span>
          {isActive && (
            <span className="text-tint-foreground bg-tint-foreground/15 flex-none rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
              Selected
            </span>
          )}
        </div>
        {isTransfer && otherAccount && (
          <div className="text-muted-foreground mt-0.5 text-xs italic">
            Transfer {signedAmount.isPositive() ? 'from' : 'to'}{' '}
            {fullAccountName(otherAccount, banks)}
          </div>
        )}
        {timestampEpoch > 0 && (
          <div className="text-muted-foreground mt-0.5 font-mono text-xs tabular-nums">
            {format(timestampEpoch, 'yyyy-MM-dd HH:mm')}
          </div>
        )}
        {recordedTransaction && (
          <div className="text-muted-foreground mt-1 text-xs">
            Recorded as{' '}
            <i>{recordedSummary(recordedTransaction, bankAccounts, banks)}</i>
          </div>
        )}
        {!recorded && (
          <div className="mt-1.5 text-xs">
            {draft.ignored && (
              <span className="text-muted-foreground italic">Ignored · </span>
            )}
            <button
              type="button"
              onClick={handleIgnoreToggle}
              disabled={disabled || isIgnorePending}
              className="text-tint-foreground font-semibold underline underline-offset-2 disabled:opacity-50"
            >
              {draft.ignored ? 'Restore' : 'Ignore'}
            </button>
          </div>
        )}
      </div>
      <div
        className={cn(
          'shrink-0 pl-2 font-mono font-medium tabular-nums',
          isDimmed
            ? 'text-muted-foreground'
            : signedAmount.isPositive()
              ? 'text-up-amount'
              : 'text-down-amount'
        )}
      >
        {signedAmount.format({signDisplay: 'exceptZero'})}
      </div>
    </div>
  );
}
