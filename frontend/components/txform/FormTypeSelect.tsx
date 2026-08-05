import {FormType} from '@/components/txform/types';
import {cn} from '@/lib/utils';

export const TRANSACTION_FORM_TABPANEL_ID = 'transaction-form-tabpanel';

export function formTypeTabId(formType: FormType): string {
  return `tab-${formType.toLowerCase()}`;
}

const TABS: {value: FormType; label: string}[] = [
  {value: 'EXPENSE', label: 'Expense'},
  {value: 'TRANSFER', label: 'Transfer'},
  {value: 'INCOME', label: 'Income'},
];

export function FormTypeSelect({
  value,
  setValue,
  disabled,
}: {
  value: FormType;
  setValue: (newValue: FormType) => void;
  disabled: boolean;
}) {
  return (
    <div
      role="tablist"
      aria-label="Transaction type"
      className="bg-muted grid w-full grid-cols-3 gap-1 rounded-xl p-1"
    >
      {TABS.map(tab => {
        const selected = value === tab.value;
        return (
          <button
            key={tab.value}
            id={formTypeTabId(tab.value)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={TRANSACTION_FORM_TABPANEL_ID}
            onClick={() => setValue(tab.value)}
            disabled={disabled}
            className={cn(
              'h-10 rounded-lg text-sm font-semibold transition-colors',
              'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              selected
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
