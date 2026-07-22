import {ParentTransaction} from '@/components/txform/income/ParentTransaction';
import {Description} from '@/components/txform/shared/Description';
import {ExtraChip, RevealedExtra} from '@/components/txform/shared/extras';
import {TransactionFormSchema} from '@/components/txform/types';
import {useState} from 'react';
import {useFormContext} from 'react-hook-form';

export function ExtraFields() {
  const {setValue, getValues, formState} =
    useFormContext<TransactionFormSchema>();
  const [showNote, setShowNote] = useState(
    () => !!getValues('income.description')
  );
  const [showParent, setShowParent] = useState(
    () => !!getValues('income.parentTransactionId')
  );
  const disabled = formState.isSubmitting;
  const anyHidden = !showNote || !showParent;
  return (
    <div className="space-y-3 border-t pt-4">
      {anyHidden && (
        <div className="flex flex-wrap gap-2">
          {!showNote && (
            <ExtraChip onClick={() => setShowNote(true)} disabled={disabled}>
              Note
            </ExtraChip>
          )}
          {!showParent && (
            <ExtraChip onClick={() => setShowParent(true)} disabled={disabled}>
              Link refund
            </ExtraChip>
          )}
        </div>
      )}
      {showNote && (
        <RevealedExtra
          name="note"
          disabled={disabled}
          onRemove={() => {
            setShowNote(false);
            setValue('income.description', null);
          }}
        >
          <Description fieldName="income.description" />
        </RevealedExtra>
      )}
      {showParent && (
        <RevealedExtra
          name="refund"
          disabled={disabled}
          onRemove={() => {
            setShowParent(false);
            setValue('income.parentTransactionId', null);
          }}
        >
          <ParentTransaction />
        </RevealedExtra>
      )}
    </div>
  );
}
