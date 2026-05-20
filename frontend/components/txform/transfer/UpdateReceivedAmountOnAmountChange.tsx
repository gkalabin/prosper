import {useAccountUnitsEqual} from '@/components/txform/transfer/Amount';
import {TransactionFormSchema} from '@/components/txform/types';
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
