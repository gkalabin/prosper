import {TransactionFormSchema} from '@/components/txform/v2/types';
import {Button} from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
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
import {PersonalExpense} from '@/lib/model/transaction/PersonalExpense';
import {formatAmount} from '@/lib/model/transaction/Transaction';
import {shortRelativeDate} from '@/lib/TimeHelpers';
import {cn} from '@/lib/utils';
import {CheckIcon, ChevronUpDownIcon} from '@heroicons/react/24/outline';
import {differenceInMonths} from 'date-fns';
import {useMemo, useState} from 'react';
import {useFormContext} from 'react-hook-form';

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
  onChange: (id: number) => void;
}) {
  const {transactions, bankAccounts, stocks} = useAllDatabaseDataContext();
  const [optionsOpen, setOptionsOpen] = useState(false);

  const parentTransaction = transactions.find(t => t.id === value) ?? null;

  const parentExpense =
    parentTransaction?.kind === 'PersonalExpense' ? parentTransaction : null;

  const makeTransactionLabel = (t: PersonalExpense): string =>
    `${formatAmount(t, bankAccounts, stocks)} ${t.vendor} ${shortRelativeDate(
      t.timestampEpoch
    )}`;

  const options = useMemo(() => {
    const filteredTransactions = transactions.filter(
      (t): t is PersonalExpense =>
        t.kind === 'PersonalExpense' && t.accountId === accountId
    );

    const recentTransactions = filteredTransactions.filter(
      t => differenceInMonths(new Date(), t.timestampEpoch) < 3
    );

    return recentTransactions.map(t => ({
      id: t.id,
      label: makeTransactionLabel(t),
    }));
  }, [transactions, accountId, bankAccounts, stocks]);

  return (
    <Popover modal={true} open={optionsOpen} onOpenChange={setOptionsOpen}>
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
            ? makeTransactionLabel(parentExpense)
            : 'Select a transaction'}
          <ChevronUpDownIcon className="ml-2 h-5 w-5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="max-h-[--radix-popover-content-available-height] w-[--radix-popover-trigger-width] p-0"
        side="bottom"
      >
        <Command>
          <CommandInput placeholder="Search transactions..." />
          <CommandList>
            <CommandEmpty>No transactions found.</CommandEmpty>
            <CommandGroup heading="Recent Transactions">
              {options.map(option => (
                <CommandItem
                  key={option.id}
                  value={option.id + option.label}
                  onSelect={() => {
                    onChange(option.id);
                    setOptionsOpen(false);
                  }}
                >
                  <CheckIcon
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === option.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
