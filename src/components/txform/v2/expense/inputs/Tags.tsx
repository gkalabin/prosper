import {TagsSelect} from '@/components/txform/v2/expense/inputs/TagsSelect';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {useFormContext} from 'react-hook-form';

export function Tags() {
  const {control} = useFormContext<TransactionFormSchema>();
  return (
    <FormField
      control={control}
      name="expense.tagNames"
      render={({field}) => (
        <FormItem className="col-span-6">
          <FormLabel>Tags</FormLabel>
          <FormControl>
            <TagsSelect value={field.value} onChange={field.onChange} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
