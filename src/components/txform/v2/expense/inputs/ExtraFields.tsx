import {Description} from '@/components/txform/v2/expense/inputs/Description';
import {Trip} from '@/components/txform/v2/expense/inputs/Trip';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {Button} from '@/components/ui/button';
import {useState} from 'react';
import {useFormContext} from 'react-hook-form';

export function ExtraFields() {
  const {setValue, watch, formState} = useFormContext<TransactionFormSchema>();
  const tripName = watch('expense.tripName');
  const description = watch('expense.description');
  const [showNote, setShowNote] = useState(!!description);
  const [showTrip, setShowTrip] = useState(!!tripName);
  return (
    <>
      <div className="col-span-6 text-xs">
        Add a{' '}
        <Button
          type="button"
          onClick={() => {
            const shouldShowNote = !showNote;
            setShowNote(shouldShowNote);
            if (!shouldShowNote) {
              setValue('expense.description', null);
            }
          }}
          variant="link"
          size="inherit"
          disabled={formState.isSubmitting}
        >
          note
        </Button>{' '}
        to this transaction or link it to a{' '}
        <Button
          type="button"
          onClick={() => {
            const shouldShowTrip = !showTrip;
            setShowTrip(shouldShowTrip);
            if (!shouldShowTrip) {
              setValue('expense.tripName', null);
            }
          }}
          variant="link"
          size="inherit"
          disabled={formState.isSubmitting}
        >
          trip
        </Button>
        .
      </div>
      {showTrip && <Trip />}
      {showNote && <Description />}
    </>
  );
}
