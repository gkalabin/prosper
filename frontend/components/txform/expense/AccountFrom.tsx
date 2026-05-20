import {useSharingType} from '@/components/txform/expense/useSharingType';
import {useSharingTypeActions} from '@/components/txform/expense/useSharingTypeActions';
import {Account} from '@/components/txform/shared/Account';
import {TransactionFormSchema} from '@/components/txform/types';
import {Button} from '@/components/ui/button';
import {TransactionPrototype} from '@/lib/txsuggestions/TransactionPrototype';
import {useFormContext} from 'react-hook-form';

export function AccountFrom({proto}: {proto: TransactionPrototype | null}) {
  const {formState} = useFormContext<TransactionFormSchema>();
  const {paidSelf} = useSharingType();
  const {setPaidOther} = useSharingTypeActions();
  if (!paidSelf) {
    return null;
  }
  return (
    <>
      <Account fieldName="expense.accountId" label="I paid from" />
      <div className="col-span-6 -mt-3 text-xs">
        or{' '}
        <Button
          type="button"
          onClick={() => setPaidOther(proto)}
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
