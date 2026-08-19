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
      size="md"
      onClick={() => setValue('income.isShared', true)}
      disabled={formState.isSubmitting}
    >
      <UsersIcon />
      Split
    </Button>
  );
}
