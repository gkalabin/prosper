import {undoTailwindInputStyles} from '@/components/forms/Select';
import {AccountFrom} from '@/components/txform/v2/expense/inputs/AccountFrom';
import {Amount} from '@/components/txform/v2/expense/inputs/Amount';
import {Category} from '@/components/txform/v2/expense/inputs/Category';
import {Companion} from '@/components/txform/v2/expense/inputs/Companion';
import {ExtraFields} from '@/components/txform/v2/expense/inputs/ExtraFields';
import {OwnShareAmount} from '@/components/txform/v2/expense/inputs/OwnShareAmount';
import {Payer} from '@/components/txform/v2/expense/inputs/Payer';
import {RepaymentFields} from '@/components/txform/v2/expense/inputs/RepaymentFields';
import {SplitTransactionToggle} from '@/components/txform/v2/expense/inputs/SplitTransactionToggle';
import {Timestamp} from '@/components/txform/v2/expense/inputs/Timestamp';
import {Vendor} from '@/components/txform/v2/expense/inputs/Vendor';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {Controller, useFormContext} from 'react-hook-form';
import CreatableSelect from 'react-select/creatable';

export const ExpenseForm = () => {
  return (
    <>
      <Timestamp fieldName="expense.timestamp" />
      <AccountFrom />
      <Payer />
      <SplitTransactionToggle />
      <Companion />
      <Amount />
      <OwnShareAmount />
      <RepaymentFields />
      <Vendor />
      <Tags />
      <Category />
      <ExtraFields />
    </>
  );
};

function Tags() {
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
