import {Input} from '@/components/forms/Input';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {uniqMostFrequent} from '@/lib/collections';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {isExpense, isIncome} from '@/lib/model/transaction/Transaction';
import {notEmpty} from '@/lib/util/util';
import {useFormContext} from 'react-hook-form';

export function Vendor() {
  const {register} = useFormContext<TransactionFormSchema>();
  const {transactions} = useAllDatabaseDataContext();
  const vendors = uniqMostFrequent(
    transactions
      .map(x => {
        if (isExpense(x)) {
          return x.vendor;
        }
        if (isIncome(x)) {
          return x.payer;
        }
        return null;
      })
      .filter(notEmpty)
  );
  return (
    <div className="col-span-6">
      <label
        htmlFor="vendor"
        className="block text-sm font-medium text-gray-700"
      >
        Vendor
      </label>
      <Input
        type="text"
        list="vendors"
        className="block w-full"
        {...register('expense.vendor')}
      />
      <datalist id="vendors">
        {vendors.map(v => (
          <option key={v} value={v} />
        ))}
      </datalist>
    </div>
  );
}
