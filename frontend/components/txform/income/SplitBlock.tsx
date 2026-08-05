import {OwnShareAmount} from '@/components/txform/income/OwnShareAmount';
import {Companion} from '@/components/txform/shared/Companion';
import {RevealBlock} from '@/components/txform/shared/RevealBlock';
import {TransactionFormSchema} from '@/components/txform/types';
import {useFormContext} from 'react-hook-form';

export function SplitBlock() {
  const {setValue, formState} = useFormContext<TransactionFormSchema>();
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
