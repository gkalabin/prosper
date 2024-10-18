import {FormType} from '@/components/txform/types';
import classNames from 'classnames';

const Button = (
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {active: boolean}
) => {
  const {className, active, ...rest} = props;
  return (
    <button
      type="button"
      // TODO: use cn() and disabled: class name prefix.
      className={classNames(
        className,
        props.disabled
          ? 'opacity-30'
          : 'hover:bg-gray-100 focus:bg-gray-100 dark:hover:bg-gray-600 dark:focus:bg-gray-600',
        props.active
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
      <div className="rounded-md shadow-sm">
        <Button
          className={classNames('rounded-l-lg border')}
          onClick={() => setValue('EXPENSE')}
          active={value == 'EXPENSE'}
          disabled={disabled}
        >
          Expense
        </Button>
        <Button
          className={classNames('border-b border-r border-t')}
          onClick={() => setValue('TRANSFER')}
          active={value == 'TRANSFER'}
          disabled={disabled}
        >
          Transfer
        </Button>
        <Button
          className={classNames('rounded-r-md border')}
          onClick={() => setValue('INCOME')}
          active={value == 'INCOME'}
          disabled={disabled}
        >
          Income
        </Button>
      </div>
    </div>
  );
};
