import {Description} from '@/components/txform/v2/expense/inputs/Description';
import {Trip} from '@/components/txform/v2/expense/inputs/Trip';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {Button} from '@/components/ui/button';
import {useState} from 'react';
import {useFormContext} from 'react-hook-form';

export function ExtraFields() {
  const {setValue, formState} = useFormContext<TransactionFormSchema>();
  const [showNote, setShowNote] = useState(false);
  const [showTrip, setShowTrip] = useState(false);
  return (
    <>
      <div className="col-span-6 text-xs">
        Add a{' '}
        <Button
          type="button"
          onClick={() => {
            setShowNote(!showNote);
            setValue('expense.description', null);
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
            setShowTrip(!showTrip);
            setValue('expense.tripName', null);
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
