import {useSharingType} from '@/components/txform/v2/expense/useSharingType';
import {useSharingTypeActions} from '@/components/txform/v2/expense/useSharingTypeActions';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {Switch} from '@/components/ui/switch';
import {useFormContext} from 'react-hook-form';

export function SplitTransactionToggle() {
  const {
    formState: {isSubmitting},
    control,
  } = useFormContext<TransactionFormSchema>();
  const {isShared, paidOther} = useSharingType();
  const {toggleSplitTransaction} = useSharingTypeActions();
  return (
    <FormField
      control={control}
      name={'expense.sharingType'}
      render={() => (
        <FormItem className="col-span-3 flex flex-row items-center">
          <FormControl className="w-11">
            <Switch
              checked={isShared}
              disabled={isSubmitting || paidOther}
              onCheckedChange={toggleSplitTransaction}
            />
          </FormControl>
          <FormLabel className="ml-4">Split transaction</FormLabel>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
