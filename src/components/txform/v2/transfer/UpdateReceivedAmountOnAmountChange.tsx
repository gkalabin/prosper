import {useAccountUnitsEqual} from '@/components/txform/v2/transfer/Amount';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {useEffect} from 'react';
import {useFormContext, useWatch} from 'react-hook-form';

export function UpdateReceivedAmountOnAmountChange() {
  const {control, setValue} = useFormContext<TransactionFormSchema>();
  const sameUnit = useAccountUnitsEqual();
  const amountSent = useWatch({
    control,
    name: 'transfer.amountSent',
    exact: true,
  });
  useEffect(() => {
    if (sameUnit) {
      setValue('transfer.amountReceived', amountSent);
    }
  }, [setValue, sameUnit, amountSent]);
  return null;
}
