import {Description} from '@/components/txform/v2/income/inputs/Description';
import {ParentTransaction} from '@/components/txform/v2/income/inputs/ParentTransaction';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {Button} from '@/components/ui/button';
import {useState} from 'react';
import {useFormContext} from 'react-hook-form';

export function ExtraFields() {
  const {setValue, formState} = useFormContext<TransactionFormSchema>();
  const [showNote, setShowNote] = useState(false);
  const [showParent, setShowParent] = useState(false);
  return (
    <>
      <div className="col-span-6 text-xs">
        Add a{' '}
        <Button
          type="button"
          onClick={() => {
            setShowNote(!showNote);
            setValue('income.description', null);
          }}
          variant="link"
          size="inherit"
          disabled={formState.isSubmitting}
        >
          note
        </Button>{' '}
        to this transaction or{' '}
        <Button
          type="button"
          onClick={() => {
            setShowParent(!showParent);
            setValue('income.parentTransactionId', null);
          }}
          variant="link"
          size="inherit"
          disabled={formState.isSubmitting}
        >
          link the transaction this is the refund for
        </Button>
        .
      </div>
      {showNote && <Description />}
      {showParent && <ParentTransaction />}
    </>
  );
}
