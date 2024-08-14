import {useSharingType} from '@/components/txform/v2/expense/useSharingType';
import {SharingType, TransactionFormSchema} from '@/components/txform/v2/types';
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
import {
  useFormContext,
  UseFormGetValues,
  UseFormSetValue,
} from 'react-hook-form';

export function SplitTransactionToggle() {
  const {
    formState: {isSubmitting},
    getValues,
    setValue,
    control,
  } = useFormContext<TransactionFormSchema>();
  const {sharingType, isShared, paidOther} = useSharingType();
  const mostFrequentCompanion = useMostFrequentCompanion();
  return (
    <FormField
      control={control}
      name={'expense.sharingType'}
      render={() => (
        <FormItem className="col-span-3 flex flex-row items-center">
          <FormControl className="w-11">
            <Switch
              checked={isShared}
              disabled={isSubmitting || paidOther}
              onCheckedChange={() =>
                onChange({
                  sharingType,
                  setValue,
                  getValues,
                  defaultCompanion: mostFrequentCompanion,
                })
              }
            />
          </FormControl>
          <FormLabel className="ml-4">Split transaction</FormLabel>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function useMostFrequentCompanion() {
  const {transactions} = useAllDatabaseDataContext();
  const [companion] = uniqMostFrequent(
    transactions.map(x => otherPartyNameOrNull(x)).filter(notEmpty)
  );
  return companion;
}

function onChange({
  sharingType,
  setValue,
  getValues,
  defaultCompanion,
}: {
  sharingType: SharingType;
  setValue: UseFormSetValue<TransactionFormSchema>;
  getValues: UseFormGetValues<TransactionFormSchema>;
  defaultCompanion?: string;
}) {
  if (sharingType === 'PAID_SELF_SHARED') {
    setValue('expense.sharingType', 'PAID_SELF_NOT_SHARED');
    setValue('expense.companion', null);
    setValue('expense.ownShareAmount', getValues('expense.amount'));
  } else if (sharingType === 'PAID_SELF_NOT_SHARED') {
    setValue('expense.sharingType', 'PAID_SELF_SHARED');
    setValue('expense.companion', defaultCompanion ?? '');
    setValue('expense.ownShareAmount', getValues('expense.amount') / 2);
  }
}
