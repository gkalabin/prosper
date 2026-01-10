import {FormType} from '@/components/txform/types';
import {cn} from '@/lib/utils';

const Button = (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  const {className, ...rest} = props;
  return (
    <button
      type="button"
      className={cn(
        className,
        props.disabled
          ? 'opacity-30'
          : 'hover:bg-gray-100 focus:bg-gray-100 dark:hover:bg-gray-600 dark:focus:bg-gray-600',
        props['aria-selected']
          ? 'text-indigo-700 dark:text-indigo-200'
          : 'text-gray-900 dark:text-white',
        'border border-gray-200 bg-white px-2 py-1 text-sm font-medium focus:z-10 dark:border-gray-600 dark:bg-gray-700'
      )}
      {...rest}
    >
      {props.children}
    </button>
  );
};

export const FormTypeSelect = ({
  value,
  setValue,
  disabled,
}: {
  value: FormType;
  setValue: (newValue: FormType) => void;
  disabled: boolean;
}) => {
  return (
    <div className="col-span-6 flex justify-center">
      <div role="tablist" className="rounded-md shadow-sm">
        <Button
          role="tab"
          aria-selected={value == 'EXPENSE'}
          className={cn('rounded-l-lg border')}
          onClick={() => setValue('EXPENSE')}
          disabled={disabled}
        >
          Expense
        </Button>
        <Button
          role="tab"
          aria-selected={value == 'TRANSFER'}
          className={cn('border-b border-r border-t')}
          onClick={() => setValue('TRANSFER')}
          disabled={disabled}
        >
          Transfer
        </Button>
        <Button
          role="tab"
          aria-selected={value == 'INCOME'}
          className={cn('rounded-r-md border')}
          onClick={() => setValue('INCOME')}
          disabled={disabled}
        >
          Income
        </Button>
      </div>
    </div>
  );
};
