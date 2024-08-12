import {Input} from '@/components/forms/Input';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {ButtonLink} from '@/components/ui/buttons';
import {uniqMostFrequent} from '@/lib/collections';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {otherPartyNameOrNull} from '@/lib/model/transaction/Transaction';
import {notEmpty} from '@/lib/util/util';
import {useFormContext} from 'react-hook-form';

export function Payer() {
  const {register, setValue, watch} = useFormContext<TransactionFormSchema>();
  const share = watch('expense.shareType');
  const paidSelf =
    'PAID_SELF_SHARED' == share || 'PAID_SELF_NOT_SHARED' == share;
  const paidOther = !paidSelf;
  const {transactions} = useAllDatabaseDataContext();
  const payers = uniqMostFrequent(
    transactions.map(x => otherPartyNameOrNull(x)).filter(notEmpty)
  );
  if (!paidOther) {
    return <></>;
  }
  return (
    <div className="col-span-6">
      <label
        htmlFor="payer"
        className="block text-sm font-medium text-gray-700"
      >
        This expense was paid by
      </label>
      <Input
        type="text"
        list="payers"
        className="block w-full"
        {...register('expense.payer')}
      />
      <datalist id="payers">
        {payers.map(v => (
          <option key={v} value={v} />
        ))}
      </datalist>
      <div className="text-xs">
        or{' '}
        <ButtonLink
          onClick={() => setValue('expense.shareType', 'PAID_SELF_NOT_SHARED')}
        >
          I paid for this myself
        </ButtonLink>
        .
      </div>
    </div>
  );
}
