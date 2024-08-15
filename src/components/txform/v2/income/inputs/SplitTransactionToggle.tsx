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
  const {control} = useFormContext<TransactionFormSchema>();
  return (
    <FormField
      control={control}
      name={'income.isShared'}
      render={({field, formState}) => (
        <FormItem className="col-span-3 flex flex-row items-center">
          <FormControl className="w-11">
            <Switch
              checked={field.value}
              disabled={formState.isSubmitting}
              onCheckedChange={field.onChange}
            />
          </FormControl>
          <FormLabel className="ml-4">Split transaction</FormLabel>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
