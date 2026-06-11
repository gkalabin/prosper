import {SubFormValues} from '@/components/txform/types';
import {roundToCent} from '@/lib/util/util';
import {useEffect} from 'react';
import {useFormContext, useWatch} from 'react-hook-form';

export function UpdateOwnShareOnAmountChange({
  isShared,
  amountFieldName,
  ownShareFieldName,
}: {
  isShared: boolean;
  amountFieldName: 'expense.amount' | 'income.amount';
  ownShareFieldName: 'expense.ownShareAmount' | 'income.ownShareAmount';
}) {
  const {control, setValue} = useFormContext<SubFormValues>();
  const amount = useWatch({control, name: amountFieldName, exact: true});
  useEffect(() => {
    // Do not pass down NaN from amount to ownShare.
    const safeAmount = isNaN(amount) ? 0 : amount;
    if (!isShared) {
      setValue(ownShareFieldName, safeAmount);
    } else {
      setValue(
        ownShareFieldName,
        // Round to a whole cent to avoid fractional cents, for example when splitting 1.11.
        roundToCent(safeAmount / 2)
      );
    }
  }, [ownShareFieldName, setValue, isShared, amount]);
  return null;
}
