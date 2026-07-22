import {AddOnButton} from '@/components/txform/shared/AddOnButton';
import {TransactionFormSchema} from '@/components/txform/types';
import {UsersIcon} from '@heroicons/react/24/outline';
import {useFormContext} from 'react-hook-form';

// IncomeSplitControl is the quiet add-on that opens the income split. Income can
// be split with someone, but (unlike an expense) never "someone-else-paid".
export function IncomeSplitControl() {
  const {watch, setValue, formState} = useFormContext<TransactionFormSchema>();
  if (watch('income.isShared')) {
    return null;
  }
  return (
    <div className="flex">
      <AddOnButton
        onClick={() => setValue('income.isShared', true)}
        disabled={formState.isSubmitting}
        icon={<UsersIcon className="h-4 w-4" />}
      >
        Split with someone
      </AddOnButton>
    </div>
  );
}
