import {Trip} from '@/components/txform/expense/Trip';
import {Description} from '@/components/txform/shared/Description';
import {ExtraFields as SharedExtraFields} from '@/components/txform/shared/ExtraFields';
import {TransactionFormSchema} from '@/components/txform/types';
import {useFormContext} from 'react-hook-form';

export function ExtraFields() {
  const {getValues, setValue} = useFormContext<TransactionFormSchema>();
  return (
    <SharedExtraFields
      fields={[
        {
          key: 'note',
          revealLabel: 'Note',
          removeLabel: 'Remove note',
          initiallyShown: !!getValues('expense.description'),
          onRemove: () => setValue('expense.description', null),
          children: <Description fieldName="expense.description" />,
        },
        {
          key: 'trip',
          revealLabel: 'Trip',
          removeLabel: 'Remove trip',
          initiallyShown: !!getValues('expense.tripName'),
          onRemove: () => setValue('expense.tripName', null),
          children: <Trip />,
        },
      ]}
    />
  );
}
