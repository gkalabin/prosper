import {Trip} from '@/components/txform/expense/Trip';
import {Description} from '@/components/txform/shared/Description';
import {ExtraChip, RevealedExtra} from '@/components/txform/shared/extras';
import {TransactionFormSchema} from '@/components/txform/types';
import {useState} from 'react';
import {useFormContext} from 'react-hook-form';

export function ExtraFields() {
  const {setValue, getValues, formState} =
    useFormContext<TransactionFormSchema>();
  const [showNote, setShowNote] = useState(
    () => !!getValues('expense.description')
  );
  const [showTrip, setShowTrip] = useState(
    () => !!getValues('expense.tripName')
  );
  const disabled = formState.isSubmitting;
  const anyHidden = !showNote || !showTrip;
  return (
    <div className="space-y-3 border-t pt-4">
      {anyHidden && (
        <div className="flex flex-wrap gap-2">
          {!showNote && (
            <ExtraChip onClick={() => setShowNote(true)} disabled={disabled}>
              Note
            </ExtraChip>
          )}
          {!showTrip && (
            <ExtraChip onClick={() => setShowTrip(true)} disabled={disabled}>
              Trip
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
            setValue('expense.description', null);
          }}
        >
          <Description fieldName="expense.description" />
        </RevealedExtra>
      )}
      {showTrip && (
        <RevealedExtra
          name="trip"
          disabled={disabled}
          onRemove={() => {
            setShowTrip(false);
            setValue('expense.tripName', null);
          }}
        >
          <Trip />
        </RevealedExtra>
      )}
    </div>
  );
}
