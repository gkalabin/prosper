import {Trip} from '@/components/txform/expense/Trip';
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
    () => !!getValues('expense.description')
  );
  const [showTrip, setShowTrip] = useState(
    () => !!getValues('expense.tripName')
  );
  return (
    <>
      {(!showNote || !showTrip) && (
        <div className="col-span-6 flex flex-wrap gap-2">
          {!showNote && (
            <ExtraChip onClick={() => setShowNote(true)}>Note</ExtraChip>
          )}
          {!showTrip && (
            <ExtraChip onClick={() => setShowTrip(true)}>Link a trip</ExtraChip>
          )}
        </div>
      )}
      {showNote && (
        <RemovableField
          onRemove={() => {
            setShowNote(false);
            setValue('expense.description', null);
          }}
        >
          <Description
            fieldName="expense.description"
            label="Note"
            placeholder="Add a note…"
          />
        </RemovableField>
      )}
      {showTrip && (
        <RemovableField
          onRemove={() => {
            setShowTrip(false);
            setValue('expense.tripName', null);
          }}
        >
          <Trip />
        </RemovableField>
      )}
    </>
  );
}
