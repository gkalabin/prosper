import {undoTailwindInputStyles} from '@/components/forms/Select';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {Controller, useFormContext} from 'react-hook-form';
import CreatableSelect from 'react-select/creatable';

export function Tags() {
  const {control} = useFormContext<TransactionFormSchema>();
  const {transactions, tags} = useAllDatabaseDataContext();
  const tagFrequency = new Map<number, number>(tags.map(x => [x.id, 0]));
  transactions
    .flatMap(x => x.tagsIds)
    .forEach(x => tagFrequency.set(x, (tagFrequency.get(x) ?? 0) + 1));
  const allTags = [...tags].sort(
    (t1, t2) => (tagFrequency.get(t2.id) ?? 0) - (tagFrequency.get(t1.id) ?? 0)
  );
  const options = allTags.map(t => ({value: t.name, label: t.name}));
  return (
    <div className="col-span-6">
      <label
        htmlFor="tagNames"
        className="block text-sm font-medium text-gray-700"
      >
        Tags
      </label>
      <Controller
        name="expense.tagNames"
        control={control}
        render={({field}) => (
          <CreatableSelect
            instanceId="tagNames"
            isMulti
            styles={undoTailwindInputStyles()}
            options={options}
            isDisabled={field.disabled}
            {...field}
            value={field.value.map(v => ({label: v, value: v}))}
            onChange={tags => field.onChange(tags.map(t => t.value))}
          />
        )}
      />
    </div>
  );
}
