import {useSharingType} from '@/components/txform/v2/expense/useSharingType';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {Button} from '@/components/ui/button';
import {
  useFormContext,
  UseFormGetValues,
  UseFormSetValue,
} from 'react-hook-form';

export function RepaymentToggle() {
  const {getValues, setValue, formState} =
    useFormContext<TransactionFormSchema>();
  const {sharingType} = useSharingType();
  if (sharingType == 'PAID_OTHER_OWED') {
    return (
      <div className="text-xs">
        or{' '}
        <Button
          type="button"
          onClick={() => setAlreadyRepaid({setValue, getValues})}
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
          onClick={() => setOweMoney({setValue, getValues})}
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
  return <></>;
}

function setAlreadyRepaid({
  setValue,
  getValues,
}: {
  setValue: UseFormSetValue<TransactionFormSchema>;
  getValues: UseFormGetValues<TransactionFormSchema>;
}) {
  setValue('expense.sharingType', 'PAID_OTHER_REPAID');
  setValue('expense.repayment.accountId', getValues('expense.accountId') ?? 0);
  setValue('expense.repayment.timestamp', getValues('expense.timestamp'));
}

function setOweMoney({
  setValue,
  getValues,
}: {
  setValue: UseFormSetValue<TransactionFormSchema>;
  getValues: UseFormGetValues<TransactionFormSchema>;
}) {
  setValue('expense.sharingType', 'PAID_OTHER_OWED');
  setValue('expense.accountId', getValues('expense.repayment.accountId') ?? 0);
}
