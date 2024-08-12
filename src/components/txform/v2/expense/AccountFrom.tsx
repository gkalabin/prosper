import {Select} from '@/components/forms/Select';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {ButtonLink} from '@/components/ui/buttons';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {useDisplayBankAccounts} from '@/lib/model/AllDatabaseDataModel';
import {fullAccountName} from '@/lib/model/BankAccount';
import {useFormContext} from 'react-hook-form';

export function AccountFrom() {
  const {
    register,
    formState: {isSubmitting},
    setValue,
    watch,
  } = useFormContext<TransactionFormSchema>();
  const share = watch('expense.shareType');
  const paidSelf =
    'PAID_SELF_SHARED' == share || 'PAID_SELF_NOT_SHARED' == share;
  const accounts = useDisplayBankAccounts();
  const {banks} = useAllDatabaseDataContext();
  if (!paidSelf) {
    return <></>;
  }
  return (
    <div className="col-span-6">
      <label
        htmlFor="accountId"
        className="block text-sm font-medium text-gray-700"
      >
        I paid from
      </label>
      <Select
        className="block w-full"
        disabled={isSubmitting}
        {...register('expense.accountId', {
          valueAsNumber: true,
        })}
      >
        {accounts.map(x => (
          <option key={x.id} value={x.id}>
            {fullAccountName(x, banks)}
          </option>
        ))}
      </Select>

      <div className="text-xs">
        or{' '}
        <ButtonLink
          onClick={() => {
            setValue('expense.shareType', 'PAID_OTHER_OWED');
          }}
        >
          someone else paid for this expense
        </ButtonLink>
        .
      </div>
    </div>
  );
}
