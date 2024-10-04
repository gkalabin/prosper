import {TransactionFormSchema} from '@/components/txform/v2/types';
import {Button} from '@/components/ui/button';
import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {BankAccount} from '@/lib/model/BankAccount';
import {Stock} from '@/lib/model/Stock';
import {PersonalExpense} from '@/lib/model/transaction/PersonalExpense';
import {
  formatAmount,
  isPersonalExpense,
  Transaction,
} from '@/lib/model/transaction/Transaction';
import {shortRelativeDate} from '@/lib/TimeHelpers';
import {cn} from '@/lib/utils';
import {
  CheckIcon,
  ChevronUpDownIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {differenceInMonths} from 'date-fns';
import {useMemo, useState} from 'react';
import {useFormContext} from 'react-hook-form';
import {useDebounce} from 'use-debounce';

export function ParentTransaction() {
  const {control, getValues} = useFormContext<TransactionFormSchema>();
  return (
    <FormField
      control={control}
      name="income.parentTransactionId"
      render={({field}) => (
        <FormItem className="col-span-6">
          <FormLabel>Parent transaction</FormLabel>
          <FormControl>
            <ParentTransactionSelect
              value={field.value}
              accountId={getValues('income.accountId')}
              onChange={field.onChange}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function ParentTransactionSelect({
  value,
  accountId,
  onChange,
}: {
  value: number | null;
  accountId: number;
  onChange: (id: number | null) => void;
}) {
  const {transactions, bankAccounts, stocks} = useAllDatabaseDataContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [optionsOpen, setOptionsOpen] = useState(false);

  const parentTransaction = transactions.find(t => t.id === value) ?? null;

  const parentExpense =
    parentTransaction?.kind === 'PersonalExpense' ? parentTransaction : null;

  return (
    <Popover
      modal={true}
      open={optionsOpen}
      onOpenChange={open => {
        setOptionsOpen(open);
        if (!open) {
          setSearchQuery('');
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          className={cn(
            'w-full justify-between',
            !parentExpense && 'text-muted-foreground'
          )}
        >
          {parentExpense
            ? makeOption({t: parentExpense, bankAccounts, stocks}).label
            : 'Select a transaction'}
          {value && (
            <span
              role="button"
              tabIndex={0}
              className="text-secondary-foreground"
              onClick={e => {
                e.stopPropagation();
                onChange(null);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onChange(null);
                }
              }}
            >
              <XMarkIcon className="h-4 w-4" />
            </span>
          )}
          {!value && (
            <ChevronUpDownIcon className="ml-2 h-5 w-5 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="max-h-[--radix-popover-content-available-height] w-[--radix-popover-trigger-width] p-0"
        side="bottom"
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={searchQuery}
            onValueChange={setSearchQuery}
            placeholder="Search transactions..."
          />
          <FilteredTransactions
            query={searchQuery}
            value={value}
            onChange={v => {
              onChange(v);
              setOptionsOpen(false);
            }}
            accountId={accountId}
          />
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function FilteredTransactions({
  query,
  value,
  onChange,
  accountId,
}: {
  query: string;
  value: number | null;
  onChange: (id: number | null) => void;
  accountId: number;
}) {
  const [debouncedQuery] = useDebounce(query, 200);
  const {transactions, bankAccounts, stocks} = useAllDatabaseDataContext();
  const options = useMemo(() => {
    const expenses = findRelevantExpenses(
      transactions,
      debouncedQuery,
      accountId
    );
    return expenses.map(t => makeOption({t, bankAccounts, stocks}));
  }, [transactions, debouncedQuery, accountId, bankAccounts, stocks]);
  return (
    <CommandList>
      {options.map(({id, amount, vendor, date, label}) => {
        return (
          <CommandItem
            key={id}
            onSelect={() => onChange(id)}
            // Items with duplicate values look bad in the UI and multiple items get highlighted.
            // Label might not be unique, so add id to avoid duplicates.
            value={id + label}
          >
            <div className="flex w-full flex-row gap-2 pr-2">
              <CheckIcon
                className={cn(
                  'h-4 w-4',
                  value === id ? 'opacity-100' : 'opacity-0'
                )}
              />
              <div className="grow">
                {amount} {vendor}
              </div>
              <div className="text-sm text-muted-foreground">{date}</div>
            </div>
          </CommandItem>
        );
      })}
    </CommandList>
  );
}

function findRelevantExpenses(
  transactions: Transaction[],
  search: string,
  accountId: number
) {
  const expenses = transactions.filter(isPersonalExpense);
  const matchingExpenses = expenses.filter(t => {
    if (!search) {
      return t.accountId === accountId;
    }
    return t.vendor.toLowerCase().includes(search.toLowerCase());
  });
  let recent = matchingExpenses;
  let monthsWindow = 6;
  while (recent.length > 100 && monthsWindow > 3) {
    recent = recent.filter(
      t => differenceInMonths(new Date(), t.timestampEpoch) < monthsWindow
    );
    monthsWindow -= 1;
  }
  return recent;
}

function makeOption({
  t,
  bankAccounts,
  stocks,
}: {
  t: PersonalExpense;
  bankAccounts: BankAccount[];
  stocks: Stock[];
}) {
  const amount = formatAmount(t, bankAccounts, stocks);
  const date = shortRelativeDate(t.timestampEpoch);
  return {
    id: t.id,
    amount,
    date,
    vendor: t.vendor,
    label: `${amount} ${t.vendor} ${date}`,
  };
}
