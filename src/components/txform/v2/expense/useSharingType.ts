import {TransactionFormSchema} from '@/components/txform/v2/types';
import {useFormContext} from 'react-hook-form';

export function useSharingType() {
  const {watch} = useFormContext<TransactionFormSchema>();
  const s = watch('expense.sharingType');
  const paidSelf = s === 'PAID_SELF_SHARED' || s === 'PAID_SELF_NOT_SHARED';
  const paidOther = !paidSelf;
  return {
    sharingType: s,
    isShared:
      s === 'PAID_SELF_SHARED' ||
      s === 'PAID_OTHER_OWED' ||
      s === 'PAID_OTHER_REPAID',
    paidSelf,
    paidOther,
  };
}
