import {Select, undoTailwindInputStyles} from '@/components/forms/Select';
import {Timestamp} from '@/components/txform/v2/expense/Timestamp';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {useDisplayBankAccounts} from '@/lib/model/AllDatabaseDataModel';
import {fullAccountName} from '@/lib/model/BankAccount';
import {
  getNameWithAncestors,
  makeCategoryTree,
  mustFindCategory,
} from '@/lib/model/Category';
import {Controller, useFormContext} from 'react-hook-form';
import ReactSelect from 'react-select';

export function RepaymentFields() {
  const {
    register,
    formState: {isSubmitting},
    getValues,
    watch,
  } = useFormContext<TransactionFormSchema>();
  const accounts = useDisplayBankAccounts();
  const {banks} = useAllDatabaseDataContext();
  const share = watch('expense.shareType');
  if (share != 'PAID_OTHER_REPAID') {
    return <></>;
  }
  return (
    <div className="col-span-6 space-y-2 rounded border bg-accent p-2 pl-4">
      <Timestamp fieldName="expense.repayment.timestamp" />
      <div>
        <label
          htmlFor="accountId"
          className="block text-sm font-medium text-gray-700"
        >
          I&apos;ve paid {getValues('expense.payer') || 'them'} from
        </label>
        <Select
          className="block w-full"
          disabled={isSubmitting}
          {...register('expense.repayment.accountId', {
            valueAsNumber: true,
          })}
        >
          {accounts.map(x => (
            <option key={x.id} value={x.id}>
              {fullAccountName(x, banks)}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <label
          htmlFor="repaymentCategoryId"
          className="block text-sm font-medium text-gray-700"
        >
          Repayment transaction category
        </label>
        <RepaymentCategory />
      </div>
    </div>
  );
}

function RepaymentCategory() {
  const {control} = useFormContext<TransactionFormSchema>();
  const {categories} = useAllDatabaseDataContext();
  const tree = makeCategoryTree(categories);
  return (
    <div className="col-span-6">
      <label
        className="block text-sm font-medium text-gray-700"
        htmlFor="expense.repayment.categoryId"
      >
        Category
      </label>
      <Controller
        name="expense.repayment.categoryId"
        control={control}
        render={({field}) => (
          <ReactSelect
            instanceId="repaymentCategoryId"
            styles={undoTailwindInputStyles()}
            options={categories}
            getOptionLabel={c => getNameWithAncestors(c, tree)}
            getOptionValue={c => getNameWithAncestors(c, tree)}
            {...field}
            value={mustFindCategory(field.value, categories)}
            onChange={newValue => field.onChange(newValue!.id)}
            isDisabled={field.disabled}
          />
        )}
      />
    </div>
  );
}
