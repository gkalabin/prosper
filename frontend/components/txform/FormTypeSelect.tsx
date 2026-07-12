import {FormType} from '@/components/txform/types';
import {cn} from '@/lib/utils';

export const TRANSACTION_FORM_TABPANEL_ID = 'transaction-form-tabpanel';

const Tab = ({
  selected,
  ...props
}: {selected: boolean} & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    type="button"
    role="tab"
    aria-selected={selected}
    aria-controls={TRANSACTION_FORM_TABPANEL_ID}
    className={cn(
      'flex-1 rounded-[9px] border-0 py-2 text-sm font-semibold transition-all',
      selected
        ? 'bg-card text-foreground shadow-sm'
        : 'text-muted-foreground bg-transparent',
      props.disabled && 'opacity-50'
    )}
    {...props}
  >
    {props.children}
  </button>
);

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
    <div
      role="tablist"
      aria-label="Transaction type"
      className="bg-accent flex w-full gap-0.5 rounded-md border p-[3px]"
    >
      <Tab
        id="tab-expense"
        selected={value == 'EXPENSE'}
        onClick={() => setValue('EXPENSE')}
        disabled={disabled}
      >
        Expense
      </Tab>
      <Tab
        id="tab-transfer"
        selected={value == 'TRANSFER'}
        onClick={() => setValue('TRANSFER')}
        disabled={disabled}
      >
        Transfer
      </Tab>
      <Tab
        id="tab-income"
        selected={value == 'INCOME'}
        onClick={() => setValue('INCOME')}
        disabled={disabled}
      >
        Income
      </Tab>
    </div>
  );
};
