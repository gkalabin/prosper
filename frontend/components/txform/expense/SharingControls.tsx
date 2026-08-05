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
        onClick={toggleSplitTransaction}
        disabled={isSubmitting}
        className="flex-1 gap-2"
      >
        <UsersIcon className="h-4 w-4" />
        Split
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={setPaidOther}
        disabled={isSubmitting}
        className="flex-1 gap-2"
      >
        <UserIcon className="h-4 w-4" />
        Paid by other
      </Button>
    </div>
  );
}
