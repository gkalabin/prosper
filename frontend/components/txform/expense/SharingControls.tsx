import {useSharingTypeActions} from '@/components/txform/expense/useSharingTypeActions';
import {TransactionFormSchema} from '@/components/txform/types';
import {Button} from '@/components/ui/button';
import {UserIcon, UsersIcon} from '@heroicons/react/24/outline';
import {useFormContext} from 'react-hook-form';

export function SharingControls() {
  const {toggleSplitTransaction, setPaidOther} = useSharingTypeActions();
  const {
    formState: {isSubmitting},
  } = useFormContext<TransactionFormSchema>();
  return (
    <div className="flex gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="flex-1"
        onClick={toggleSplitTransaction}
        disabled={isSubmitting}
      >
        <UsersIcon />
        Split
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="flex-1"
        onClick={setPaidOther}
        disabled={isSubmitting}
      >
        <UserIcon />
        Paid by other
      </Button>
    </div>
  );
}
