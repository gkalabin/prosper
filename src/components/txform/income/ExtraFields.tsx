import {ParentTransaction} from '@/components/txform/income/ParentTransaction';
import {Description} from '@/components/txform/shared/Description';
import {TransactionFormSchema} from '@/components/txform/types';
import {Button} from '@/components/ui/button';
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
              setValue('income.description', null);
            }
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
            const shouldShowParent = !showParent;
            setShowParent(shouldShowParent);
            if (!shouldShowParent) {
              setValue('income.parentTransactionId', null);
            }
          }}
          variant="link"
          size="inherit"
          disabled={formState.isSubmitting}
        >
          link the transaction this is the refund for
        </Button>
        .
      </div>
      {showNote && <Description fieldName="income.description" />}
      {showParent && <ParentTransaction />}
    </>
  );
}
