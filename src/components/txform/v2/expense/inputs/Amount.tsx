import {Input} from '@/components/forms/Input';
import {useSharingType} from '@/components/txform/v2/expense/useSharingType';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import classNames from 'classnames';
import {Controller, useFormContext} from 'react-hook-form';

export function Amount() {
  const {
    formState: {isSubmitting},
  } = useFormContext<TransactionFormSchema>();
  const {isShared} = useSharingType();
  return (
    <div className={classNames(isShared ? 'col-span-3' : 'col-span-6')}>
      <label
        htmlFor="amountCents"
        className="block text-sm font-medium text-gray-700"
      >
        Amount
      </label>
      <Controller
        name="expense.amount"
        render={({field}) => (
          <Input
            {...field}
            type="text"
            inputMode="decimal"
            className="block w-full"
            onFocus={e => e.target.select()}
            onChange={e =>
              field.onChange(parseTextInputAsNumber(e.target.value))
            }
            disabled={isSubmitting}
          />
        )}
      />
    </div>
  );
}

// TODO: write tests
export function parseTextInputAsNumber(v: string): number | string {
  const normalised = v.replace(/,/g, '.');
  const match = normalised.match(/^[0-9]+(\.[0-9]+)?$/);
  if (!match) {
    return v;
  }
  return +normalised;
}
