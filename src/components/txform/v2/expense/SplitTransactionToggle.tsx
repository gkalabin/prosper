import {TransactionFormSchema} from '@/components/txform/v2/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {Switch} from '@/components/ui/switch';
import {uniqMostFrequent} from '@/lib/collections';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {otherPartyNameOrNull} from '@/lib/model/transaction/Transaction';
import {notEmpty} from '@/lib/util/util';
import {useCallback, useMemo} from 'react';
import {useFormContext} from 'react-hook-form';

export function SplitTransactionToggle() {
  const {
    formState: {isSubmitting},
    getValues,
    setValue,
    watch,
    control,
  } = useFormContext<TransactionFormSchema>();
  const share = watch('expense.shareType');
  const shared =
    'PAID_SELF_SHARED' == share ||
    'PAID_OTHER_OWED' == share ||
    'PAID_OTHER_REPAID' == share;
  const paidSelf =
    'PAID_SELF_SHARED' == share || 'PAID_SELF_NOT_SHARED' == share;
  const paidOther = !paidSelf;
  const {transactions} = useAllDatabaseDataContext();
  const mostFrequentCompanion = useMemo(() => {
    return uniqMostFrequent(
      transactions.map(x => otherPartyNameOrNull(x)).filter(notEmpty)
    )[0];
  }, [transactions]);
  const onChange = useCallback(() => {
    if (share === 'PAID_SELF_SHARED') {
      setValue('expense.shareType', 'PAID_SELF_NOT_SHARED');
      setValue('expense.companion', null);
      setValue('expense.ownShareAmount', getValues('expense.amount'));
    } else if (share === 'PAID_SELF_NOT_SHARED') {
      setValue('expense.shareType', 'PAID_SELF_SHARED');
      setValue('expense.companion', mostFrequentCompanion ?? '');
      setValue('expense.ownShareAmount', getValues('expense.amount') / 2);
    }
  }, [share, setValue, getValues, mostFrequentCompanion]);
  return (
    <FormField
      control={control}
      name={'expense.shareType'}
      render={() => (
        <FormItem className="col-span-3 flex flex-row items-center">
          <FormControl className="w-11">
            <Switch
              checked={shared}
              disabled={isSubmitting || paidOther}
              onCheckedChange={onChange}
            />
          </FormControl>
          <FormLabel className="ml-4">Split transaction</FormLabel>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
