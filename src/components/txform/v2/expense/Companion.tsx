import {Input} from '@/components/forms/Input';
import {useSharingType} from '@/components/txform/v2/expense/useSharingType';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {uniqMostFrequent} from '@/lib/collections';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {otherPartyNameOrNull} from '@/lib/model/transaction/Transaction';
import {notEmpty} from '@/lib/util/util';
import {useFormContext} from 'react-hook-form';

export function Companion() {
  const {register} = useFormContext<TransactionFormSchema>();
  const {isShared, paidSelf} = useSharingType();
  const {transactions} = useAllDatabaseDataContext();
  const otherParties = uniqMostFrequent(
    transactions.map(x => otherPartyNameOrNull(x)).filter(notEmpty)
  );
  if (!isShared) {
    return <></>;
  }
  if (!paidSelf) {
    return <div className="col-span-3"></div>;
  }
  return (
    <div className="col-span-3">
      <label
        htmlFor="otherPartyName"
        className="block text-sm font-medium text-gray-700"
      >
        Shared with
      </label>
      <Input
        type="text"
        list="companions"
        className="block w-full"
        {...register('expense.companion')}
      />
      <datalist id="companions">
        {otherParties.map(v => (
          <option key={v} value={v} />
        ))}
      </datalist>
    </div>
  );
}
