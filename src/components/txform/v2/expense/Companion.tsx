import {Input} from '@/components/forms/Input';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {uniqMostFrequent} from '@/lib/collections';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {otherPartyNameOrNull} from '@/lib/model/transaction/Transaction';
import {notEmpty} from '@/lib/util/util';
import {useFormContext} from 'react-hook-form';

export function Companion() {
  const {register, watch} = useFormContext<TransactionFormSchema>();
  const share = watch('expense.shareType');
  const shared =
    'PAID_SELF_SHARED' == share ||
    'PAID_OTHER_OWED' == share ||
    'PAID_OTHER_REPAID' == share;
  const paidSelf =
    'PAID_SELF_SHARED' == share || 'PAID_SELF_NOT_SHARED' == share;
  const {transactions} = useAllDatabaseDataContext();
  const otherParties = uniqMostFrequent(
    transactions.map(x => otherPartyNameOrNull(x)).filter(notEmpty)
  );
  if (!shared) {
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
