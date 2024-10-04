import {useSharingType} from '@/components/txform/expense/useSharingType';
import {useSharingTypeActions} from '@/components/txform/expense/useSharingTypeActions';
import {TransactionFormSchema} from '@/components/txform/types';
import {Button} from '@/components/ui/button';
import {useFormContext} from 'react-hook-form';

export function RepaymentToggle() {
  const {formState} = useFormContext<TransactionFormSchema>();
  const {sharingType} = useSharingType();
  const {setAlreadyRepaid, setOweMoney} = useSharingTypeActions();
  if (sharingType == 'PAID_OTHER_OWED') {
    return (
      <div className="text-xs">
        or{' '}
        <Button
          type="button"
          onClick={setAlreadyRepaid}
          variant="link"
          size="inherit"
          disabled={formState.isSubmitting}
        >
          I&apos;ve already paid them back
        </Button>
        .
      </div>
    );
  }
  if (sharingType == 'PAID_OTHER_REPAID') {
    return (
      <div className="text-xs">
        or{' '}
        <Button
          type="button"
          onClick={setOweMoney}
          variant="link"
          size="inherit"
          disabled={formState.isSubmitting}
        >
          I owe them money
        </Button>
        .
      </div>
    );
  }
  return null;
}
