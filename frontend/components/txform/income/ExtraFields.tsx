import {ParentTransaction} from '@/components/txform/income/ParentTransaction';
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
          initiallyShown: !!getValues('income.description'),
          onRemove: () => setValue('income.description', null),
          children: <Description fieldName="income.description" />,
        },
        {
          key: 'refund',
          revealLabel: 'Link refund',
          removeLabel: 'Remove refund',
          initiallyShown: !!getValues('income.parentTransactionId'),
          onRemove: () => setValue('income.parentTransactionId', null),
          children: <ParentTransaction />,
        },
      ]}
    />
  );
}
