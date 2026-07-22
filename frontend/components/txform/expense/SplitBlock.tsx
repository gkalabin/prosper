import {OwnShareAmount} from '@/components/txform/expense/OwnShareAmount';
import {useSharingType} from '@/components/txform/expense/useSharingType';
import {useSharingTypeActions} from '@/components/txform/expense/useSharingTypeActions';
import {Companion} from '@/components/txform/shared/Companion';
import {RevealBlock} from '@/components/txform/shared/RevealBlock';
import {TransactionFormSchema} from '@/components/txform/types';
import {SharingType} from '@/lib/grpc/gen/prosper/v1/ledger';
import {roundToCent} from '@/lib/util/util';
import {useFormContext} from 'react-hook-form';

// SplitBlock is the "I paid, split with someone" reveal: I paid the full amount
// from my account, but only my share is my expense.
export function SplitBlock() {
  const {sharingType} = useSharingType();
  const {removeShare} = useSharingTypeActions();
  const {
    formState: {isSubmitting},
  } = useFormContext<TransactionFormSchema>();
  if (sharingType !== SharingType.PAID_SELF_SHARED) {
    return null;
  }
  return (
    <RevealBlock
      heading="You paid · split"
      onRemove={removeShare}
      disabled={isSubmitting}
    >
      <div className="grid grid-cols-2 gap-3">
        <Companion fieldName="expense.companion" />
        <OwnShareAmount />
      </div>
      <QuickChips />
    </RevealBlock>
  );
}

// QuickChips do the arithmetic so typing the share is optional.
function QuickChips() {
  const {setValue, getValues, formState} =
    useFormContext<TransactionFormSchema>();
  const setShare = (amount: number) =>
    setValue('expense.ownShareAmount', amount, {shouldValidate: true});
  const half = () => {
    const total = Number(getValues('expense.amount'));
    setShare(roundToCent((isNaN(total) ? 0 : total) / 2));
  };
  return (
    <div className="mt-3 flex gap-2">
      <Chip onClick={half} disabled={formState.isSubmitting}>
        Split 50/50
      </Chip>
      <Chip onClick={() => setShare(0)} disabled={formState.isSubmitting}>
        I owe nothing
      </Chip>
    </div>
  );
}

function Chip({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="border-input bg-card text-muted-foreground hover:text-foreground rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
    >
      {children}
    </button>
  );
}
