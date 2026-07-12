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
  const {control} = useFormContext<TransactionFormSchema>();
  return (
    <FormField
      control={control}
      name={'income.isShared'}
      render={({field, formState}) => (
        <FormItem className="flex flex-row items-center">
          <FormControl className="w-11">
            <Switch
              className="data-[state=checked]:bg-brand"
              checked={field.value}
              disabled={formState.isSubmitting}
              onCheckedChange={field.onChange}
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
