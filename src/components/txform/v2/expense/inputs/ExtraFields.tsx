import {Input} from '@/components/forms/Input';
import {Trips} from '@/components/txform/v2/expense/inputs/Trips';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {ButtonLink} from '@/components/ui/buttons';
import {uniqMostFrequent} from '@/lib/collections';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {notEmpty} from '@/lib/util/util';
import {useState} from 'react';
import {useFormContext} from 'react-hook-form';

export function ExtraFields() {
  const {setValue} = useFormContext<TransactionFormSchema>();
  const [showNote, setShowNote] = useState(false);
  const [showTrip, setShowTrip] = useState(false);
  return (
    <>
      <div className="col-span-6 text-xs">
        Add a{' '}
        <ButtonLink
          onClick={() => {
            setShowNote(!showNote);
            setValue('expense.description', '');
          }}
        >
          note
        </ButtonLink>{' '}
        to this transaction or link it to a{' '}
        <ButtonLink
          onClick={() => {
            setShowTrip(!showTrip);
            setValue('expense.tripName', '');
          }}
        >
          trip
        </ButtonLink>
        .
      </div>
      {showTrip && <Trips />}
      {showNote && <Description />}
    </>
  );
}

export function Description() {
  const {register} = useFormContext<TransactionFormSchema>();
  const {transactions} = useAllDatabaseDataContext();
  const descriptions = uniqMostFrequent(
    transactions.map(x => x.note).filter(notEmpty)
  );
  return (
    <div className="col-span-6">
      <label
        htmlFor="description"
        className="block text-sm font-medium text-gray-700"
      >
        Description
      </label>
      <Input
        type="text"
        list="descriptions"
        className="block w-full"
        {...register('expense.description')}
      />
      <datalist id="descriptions">
        {descriptions.map(v => (
          <option key={v} value={v} />
        ))}
      </datalist>
    </div>
  );
}
