import {TransactionFormSchema} from '@/components/txform/types';
import {SharingType} from '@/lib/grpc/gen/prosper/v1/ledger';
import {useFormContext} from 'react-hook-form';

export function useSharingType() {
  const {watch} = useFormContext<TransactionFormSchema>();
  const s = watch('expense.sharingType');
  const paidSelf =
    s === SharingType.PAID_SELF_SHARED ||
    s === SharingType.PAID_SELF_NOT_SHARED;
  const paidOther = !paidSelf;
  return {
    sharingType: s,
    isShared:
      s === SharingType.PAID_SELF_SHARED ||
      s === SharingType.PAID_OTHER_OWED ||
      s === SharingType.PAID_OTHER_REPAID,
    paidSelf,
    paidOther,
  };
}
