import {useSharingType} from '@/components/txform/v2/expense/useSharingType';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {centsToDollar, dollarToCents} from '@/lib/util/util';
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
  const {control, setValue} = useFormContext<TransactionFormSchema>();
  const amount = useWatch({control, name: amountFieldName, exact: true});
  useEffect(() => {
    // Do not pass down NaN from amount to ownShare.
    const safeAmount = isNaN(amount) ? 0 : amount;
    if (!isShared) {
      setValue(ownShareFieldName, safeAmount);
    } else {
      setValue(
        ownShareFieldName,
        // Converting to cents and back to dollars to avoid fractional cents, for example when splitting 1.11.
        centsToDollar(dollarToCents(safeAmount) / 2)
      );
    }
  }, [setValue, isShared, amount]);
  return null;
}
