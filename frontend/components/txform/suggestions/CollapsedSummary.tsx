import {
  draftTitle,
  signedAmountForAccountNanos,
} from '@/components/txform/suggestions/helpers';
import {AmountWithUnit} from '@/lib/AmountWithUnit';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {TransactionDraft} from '@/lib/grpc/gen/prosper/v1/ledger';
import {accountUnit} from '@/lib/model/BankAccount';
import {winnerId} from '@/lib/txsuggestions/candidate';
import {CheckIcon} from '@heroicons/react/24/outline';

// CollapsedSummary is the one-line receipt the suggestions panel shrinks to
// after a pick: it says what was chosen and offers a way back, so the collapse
// explains itself rather than looking like a bug.
export function CollapsedSummary({
  draft,
  onChange,
  disabled,
}: {
  draft: TransactionDraft;
  onChange: () => void;
  disabled: boolean;
}) {
  const {bankAccounts, stocks} = useCoreDataContext();
  const accountId =
    winnerId(draft.accountFromId) ?? winnerId(draft.accountToId, null);
  const account = bankAccounts.find(a => a.id === accountId);
  const amount = account
    ? new AmountWithUnit({
        amountNanos: signedAmountForAccountNanos(draft, account.id),
        unit: accountUnit(account, stocks),
      })
    : null;
  return (
    <div className="border-input bg-card flex items-center gap-3 rounded-2xl border p-3 shadow-sm">
      <span className="bg-tint text-tint-foreground grid h-8 w-8 flex-none place-items-center rounded-lg">
        <CheckIcon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-muted-foreground text-[11px] font-bold uppercase tracking-wide">
          Prefilled from suggestion
        </div>
        <div className="mt-0.5 truncate text-sm font-semibold">
          {draftTitle(draft)}
          {amount && (
            <>
              {' · '}
              <span className="font-mono tabular-nums">
                {amount.format({signDisplay: 'exceptZero'})}
              </span>
            </>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onChange}
        disabled={disabled}
        className="border-input bg-secondary text-foreground hover:bg-secondary/80 flex-none rounded-lg border px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
      >
        Change
      </button>
    </div>
  );
}
