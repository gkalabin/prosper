import {OwnShareAmount} from '@/components/txform/income/OwnShareAmount';
import {Companion} from '@/components/txform/shared/Companion';
import {RevealBlock} from '@/components/txform/shared/RevealBlock';
import {TransactionFormSchema} from '@/components/txform/types';
import {useFormContext} from 'react-hook-form';

// IncomeSplitBlock is the reveal for income shared with someone: only my share
// is my income.
export function IncomeSplitBlock() {
  const {watch, setValue, formState} = useFormContext<TransactionFormSchema>();
  if (!watch('income.isShared')) {
    return null;
  }
  return (
    <RevealBlock
      heading="Received · split"
      disabled={formState.isSubmitting}
      onRemove={() => {
        setValue('income.isShared', false);
        setValue('income.companion', null);
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <Companion fieldName="income.companion" />
        <OwnShareAmount />
      </div>
    </RevealBlock>
  );
}
