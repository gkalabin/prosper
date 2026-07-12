import {ParentTransaction} from '@/components/txform/income/ParentTransaction';
import {Description} from '@/components/txform/shared/Description';
import {
  ExtraChip,
  RemovableField,
} from '@/components/txform/shared/OptionalFields';
import {TransactionFormSchema} from '@/components/txform/types';
import {useState} from 'react';
import {useFormContext} from 'react-hook-form';

export function ExtraFields() {
  const {setValue, getValues} = useFormContext<TransactionFormSchema>();
  const [showNote, setShowNote] = useState(
    () => !!getValues('income.description')
  );
  const [showParent, setShowParent] = useState(
    () => !!getValues('income.parentTransactionId')
  );
  return (
    <>
      {showParent && (
        <RemovableField
          onRemove={() => {
            setShowParent(false);
            setValue('income.parentTransactionId', null);
          }}
        >
          <ParentTransaction />
        </RemovableField>
      )}
      {(!showNote || !showParent) && (
        <div className="col-span-6 flex flex-wrap gap-2">
          {!showNote && (
            <ExtraChip onClick={() => setShowNote(true)}>Note</ExtraChip>
          )}
          {!showParent && (
            <ExtraChip onClick={() => setShowParent(true)}>
              Mark as refund
            </ExtraChip>
          )}
        </div>
      )}
      {showNote && (
        <RemovableField
          onRemove={() => {
            setShowNote(false);
            setValue('income.description', null);
          }}
        >
          <Description
            fieldName="income.description"
            label="Note"
            placeholder="Add a note…"
          />
        </RemovableField>
      )}
    </>
  );
}
