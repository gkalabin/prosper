import {useSharingType} from '@/components/txform/expense/useSharingType';
import {useSharingTypeActions} from '@/components/txform/expense/useSharingTypeActions';
import {TransactionFormSchema} from '@/components/txform/types';
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
  if (paidOther) {
    return null;
  }
  return (
    <FormField
      control={control}
      name={'expense.sharingType'}
      render={() => (
        <FormItem className="flex flex-row items-center">
          <FormControl className="w-11">
            <Switch
              className="data-[state=checked]:bg-brand"
              checked={isShared}
              disabled={isSubmitting}
              onCheckedChange={toggleSplitTransaction}
            />
          </FormControl>
          <FormLabel className="ml-2.5 text-[13px] font-semibold">
            Split with someone
          </FormLabel>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
