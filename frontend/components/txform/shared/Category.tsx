import {CategorySelect} from '@/components/txform/shared/CategorySelect';
import {FieldLabel} from '@/components/txform/shared/FieldLabel';
import {SubFormValues} from '@/components/txform/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import {useFormContext} from 'react-hook-form';

export function Category({
  fieldName,
}: {
  fieldName: 'expense.categoryId' | 'income.categoryId' | 'transfer.categoryId';
}) {
  const {control, formState} = useFormContext<SubFormValues>();
  return (
    <FormField
      control={control}
      name={fieldName}
      render={({field}) => (
        <FormItem className="col-span-6 space-y-1.5">
          <FieldLabel>Category</FieldLabel>
          <FormControl>
            <CategorySelect
              value={field.value}
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
