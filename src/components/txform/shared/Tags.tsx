import {TagsSelect} from '@/components/txform/shared/TagsSelect';
import {TransactionFormSchema} from '@/components/txform/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {useFormContext} from 'react-hook-form';

export function Tags({
  fieldName,
}: {
  fieldName: 'expense.tagNames' | 'income.tagNames' | 'transfer.tagNames';
}) {
  const {control, formState} = useFormContext<TransactionFormSchema>();
  return (
    <FormField
      control={control}
      name={fieldName}
      render={({field}) => (
        <FormItem className="col-span-6">
          <FormLabel>Tags</FormLabel>
          <FormControl>
            <TagsSelect
              value={field.value ?? []}
              onChange={field.onChange}
              disabled={formState.isSubmitting}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
