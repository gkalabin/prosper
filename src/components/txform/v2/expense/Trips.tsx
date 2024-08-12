import {Input} from '@/components/forms/Input';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {hasTrip} from '@/lib/model/transaction/Transaction';
import {Trip} from '@/lib/model/Trip';
import {isBefore} from 'date-fns';
import {useFormContext} from 'react-hook-form';

export function Trips() {
  const {register} = useFormContext<TransactionFormSchema>();
  const {transactions, trips} = useAllDatabaseDataContext();
  const transactionsWithTrips = transactions.filter(hasTrip);
  const tripLastUsageDate = new Map<number, number>();
  transactionsWithTrips.forEach(x => {
    const existing = tripLastUsageDate.get(x.tripId);
    if (!existing || isBefore(existing, x.timestampEpoch)) {
      tripLastUsageDate.set(x.tripId, x.timestampEpoch);
    }
  });
  const tripById = new Map<number, Trip>(trips.map(x => [x.id, x]));
  const tripIdsByLastUsageDate = [...tripLastUsageDate.entries()]
    .sort(([_k1, ts1], [_k2, ts2]) => ts2 - ts1)
    .map(([tripId]) => tripId);
  const tripNames = tripIdsByLastUsageDate.map(
    x => tripById.get(x)?.name ?? 'Unknown trip'
  );
  return (
    <div className="col-span-6">
      <label
        htmlFor="tripName"
        className="block text-sm font-medium text-gray-700"
      >
        Trip
      </label>
      <Input
        type="text"
        list="tripNames"
        className="block w-full"
        {...register('expense.tripName')}
      />
      <datalist id="tripNames">
        {tripNames.map(v => (
          <option key={v} value={v} />
        ))}
      </datalist>
    </div>
  );
}
