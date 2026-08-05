import {TransactionFormSchema} from '@/components/txform/types';
import {Button} from '@/components/ui/button';
import {UsersIcon} from '@heroicons/react/24/outline';
import {useFormContext} from 'react-hook-form';

export function SharingControls() {
  const {setValue, formState} = useFormContext<TransactionFormSchema>();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => setValue('income.isShared', true)}
      disabled={formState.isSubmitting}
      className="shrink-0 gap-2"
    >
      <UsersIcon className="h-4 w-4" />
      Split
    </Button>
  );
}
