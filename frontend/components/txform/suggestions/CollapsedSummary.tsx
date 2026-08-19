import {draftSummary} from '@/components/txform/suggestions/summary';
import {Button} from '@/components/ui/button';
import {assertDefined} from '@/lib/assert';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {TransactionDraft} from '@/lib/grpc/gen/prosper/v1/ledger';
import {mustFindBankAccount} from '@/lib/model/BankAccount';
import {signedAmountForAccount} from '@/lib/model/transaction/TransactionDraft';
import {winnerId} from '@/lib/txsuggestions/candidate';
import {CheckIcon} from '@heroicons/react/24/outline';

// CollapsedSummary is the one-line receipt the suggestions panel shrinks to after a pick.
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
  assertDefined(accountId, 'suggestion draft has no account');
  const account = mustFindBankAccount(bankAccounts, accountId);
  const amount = signedAmountForAccount(draft, account, stocks);
  return (
    <div className="border-input bg-card flex items-center gap-3 rounded-2xl border p-3 shadow-sm">
      <span className="bg-tint text-accent grid h-8 w-8 flex-none place-items-center rounded-lg">
        <CheckIcon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-muted-foreground text-xs font-bold uppercase tracking-wide">
          Prefilled from suggestion
        </div>
        <div className="mt-0.5 truncate text-sm font-semibold">
          {draftSummary(draft)}
          {' · '}
          <span className="font-mono tabular-nums">{amount.format()}</span>
        </div>
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={onChange}
        disabled={disabled}
      >
        Change
      </Button>
    </div>
  );
}
