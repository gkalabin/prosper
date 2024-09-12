import {useSharingType} from '@/components/txform/v2/expense/useSharingType';
import {Account} from '@/components/txform/v2/shared/Account';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {Button} from '@/components/ui/button';
import {useFormContext} from 'react-hook-form';

export function AccountFrom() {
  const {formState, setValue} = useFormContext<TransactionFormSchema>();
  const {paidSelf} = useSharingType();
  if (!paidSelf) {
    return <></>;
  }
  return (
    <>
      <Account fieldName="expense.accountId" label="I paid from" />
      <div className="col-span-6 -mt-3 text-xs">
        or{' '}
        <Button
          type="button"
          onClick={() => setValue('expense.sharingType', 'PAID_OTHER_OWED')}
          variant="link"
          size="inherit"
          disabled={formState.isSubmitting}
        >
          someone else paid for this expense
        </Button>
        .
      </div>
    </>
  );
}
