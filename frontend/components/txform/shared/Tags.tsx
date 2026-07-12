import {FieldLabel} from '@/components/txform/shared/FieldLabel';
import {TagsSelect} from '@/components/txform/shared/TagsSelect';
import {SubFormValues} from '@/components/txform/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import {useFormContext} from 'react-hook-form';

export function Tags({
  fieldName,
}: {
  fieldName: 'expense.tagNames' | 'income.tagNames' | 'transfer.tagNames';
}) {
  const {control, formState} = useFormContext<SubFormValues>();
  return (
    <FormField
      control={control}
      name={fieldName}
      render={({field}) => (
        <FormItem className="col-span-6 space-y-1.5">
          <FieldLabel>Tags</FieldLabel>
          <FormControl>
            <TagsSelect
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
