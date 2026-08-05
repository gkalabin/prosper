import {OwnShareAmount} from '@/components/txform/expense/OwnShareAmount';
import {useSharingTypeActions} from '@/components/txform/expense/useSharingTypeActions';
import {Companion} from '@/components/txform/shared/Companion';
import {RevealBlock} from '@/components/txform/shared/RevealBlock';
import {TransactionFormSchema} from '@/components/txform/types';
import {Button} from '@/components/ui/button';
import {roundToCent} from '@/lib/util/util';
import {useFormContext} from 'react-hook-form';

export function SplitBlock() {
  const {toggleSplitTransaction} = useSharingTypeActions();
  const {
    formState: {isSubmitting},
  } = useFormContext<TransactionFormSchema>();
  return (
    <RevealBlock
      heading="You paid · split"
      onRemove={toggleSplitTransaction}
      disabled={isSubmitting}
    >
      <div className="grid grid-cols-2 gap-3">
        <Companion fieldName="expense.companion" />
        <OwnShareAmount />
      </div>
      <OwnSharePresets />
    </RevealBlock>
  );
}

function OwnSharePresets() {
  const {setValue, getValues, formState} =
    useFormContext<TransactionFormSchema>();
  const setShare = (amount: number) =>
    setValue('expense.ownShareAmount', amount, {shouldValidate: true});
  const total = () => {
    const amount = Number(getValues('expense.amount'));
    return isNaN(amount) ? 0 : amount;
  };
  return (
    <div className="mt-3 flex gap-2">
      <OwnSharePresetButton
        onClick={() => setShare(roundToCent(total() / 2))}
        disabled={formState.isSubmitting}
      >
        Split 50/50
      </OwnSharePresetButton>
      <OwnSharePresetButton
        onClick={() => setShare(0)}
        disabled={formState.isSubmitting}
      >
        I owe nothing
      </OwnSharePresetButton>
      <OwnSharePresetButton
        onClick={() => setShare(total())}
        disabled={formState.isSubmitting}
      >
        I owe all
      </OwnSharePresetButton>
    </div>
  );
}

function OwnSharePresetButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="inherit"
      onClick={onClick}
      disabled={disabled}
      className="border-input bg-card text-muted-foreground hover:text-foreground hover:bg-card rounded-lg px-3 py-1.5 text-xs font-semibold"
    >
      {children}
    </Button>
  );
}
