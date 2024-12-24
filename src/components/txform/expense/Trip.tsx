import {TransactionFormSchema} from '@/components/txform/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {Input} from '@/components/ui/input';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {useTransactionDataContext} from '@/lib/context/TransactionDataContext';
import {hasTrip} from '@/lib/model/transaction/Transaction';
import {Trip as TripModel} from '@/lib/model/Trip';
import {isBefore} from 'date-fns';
import {useMemo} from 'react';
import {useFormContext} from 'react-hook-form';

export function Trip() {
  const {control} = useFormContext<TransactionFormSchema>();
  const tripNames = useTripNames();
  return (
    <FormField
      control={control}
      name="expense.tripName"
      render={({field}) => (
        <FormItem className="col-span-6">
          <FormLabel>Trip</FormLabel>
          <FormControl>
            <Input
              type="text"
              datalist={tripNames}
              {...field}
              value={field.value ?? ''}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function useTripNames() {
  const {transactions} = useTransactionDataContext();
  const {trips} = useCoreDataContext();
  return useMemo(() => {
    const tripLastUsageDate = new Map<number, number>();
    transactions.filter(hasTrip).forEach(x => {
      const existing = tripLastUsageDate.get(x.tripId);
      if (!existing || isBefore(existing, x.timestampEpoch)) {
        tripLastUsageDate.set(x.tripId, x.timestampEpoch);
      }
    });
    const tripById = new Map<number, TripModel>(trips.map(x => [x.id, x]));
    const tripIdsByLastUsageDate = [...tripLastUsageDate.entries()]
      .sort(([_k1, ts1], [_k2, ts2]) => ts2 - ts1)
      .map(([tripId]) => tripId);
    const tripNames = tripIdsByLastUsageDate.map(
      x => tripById.get(x)?.name ?? 'Unknown trip'
    );
    return tripNames;
  }, [transactions, trips]);
}
