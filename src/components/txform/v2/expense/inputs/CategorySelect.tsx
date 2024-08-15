import {Button} from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {uniqMostFrequent} from '@/lib/collections';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {
  Category as CategoryModel,
  CategoryTree,
  getNameWithAncestors,
  immediateChildren,
  makeCategoryTree,
  mustFindCategory,
} from '@/lib/model/Category';
import {Transaction, isExpense} from '@/lib/model/transaction/Transaction';
import {cn} from '@/lib/utils';
import {CheckIcon, ChevronUpDownIcon} from '@heroicons/react/24/outline';
import {differenceInMonths} from 'date-fns';
import {useMemo, useState} from 'react';

const MAX_MOST_FREQUENT = 5;

export function CategorySelect({
  value,
  onChange,
  relevantTransactionFilter,
}: {
  value: number;
  onChange: (id: number) => void;
  relevantTransactionFilter: (t: Transaction) => boolean;
}) {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const {categories} = useAllDatabaseDataContext();
  const tree = useMemo(() => makeCategoryTree(categories), [categories]);
  const groups = useOptions({relevantTransactionFilter, tree});
  return (
    <Popover modal={true} open={optionsOpen} onOpenChange={setOptionsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn(
            'w-full justify-between',
            // TODO: remove as it's always false.
            !value && 'text-muted-foreground'
          )}
        >
          {getNameWithAncestors(mustFindCategory(value, categories), tree)}
          <ChevronUpDownIcon className="ml-2 h-5 w-5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="max-h-[--radix-popover-content-available-height] w-[--radix-popover-trigger-width] p-0"
        side="bottom"
      >
        <Command>
          <CommandInput placeholder="Search category..." />
          <CommandList>
            <CommandEmpty>No category found.</CommandEmpty>
            {groups.map(group => (
              <CommandGroup key={group.label} heading={group.label}>
                {group.options.map(c => (
                  <CommandItem
                    key={c.id}
                    value={c.fullName}
                    onSelect={() => {
                      onChange(c.id);
                      setOptionsOpen(false);
                    }}
                  >
                    <CheckIcon
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === c.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {c.fullName}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

type CategoryOptions = Array<{
  label: string;
  options: Array<{id: number; fullName: string}>;
}>;

function useOptions({
  relevantTransactionFilter,
  tree,
}: {
  relevantTransactionFilter: (t: Transaction) => boolean;
  tree: CategoryTree;
}): CategoryOptions {
  const {categories, transactions} = useAllDatabaseDataContext();
  const groups = useMemo(() => {
    const mostFrequentIds = mostFrequentCategories(
      transactions,
      relevantTransactionFilter
    );
    const mostFrequent = mostFrequentIds.map(id =>
      mustFindCategory(id, categories)
    );
    const categoriesWithoutChildren = categories.filter(
      c => immediateChildren(c, tree).length === 0
    );
    const toOption = (c: CategoryModel) => ({
      id: c.id,
      fullName: getNameWithAncestors(c, tree),
    });
    return [
      {
        label: 'Most Frequently Used',
        options: mostFrequent.slice(0, MAX_MOST_FREQUENT).map(toOption),
      },
      {
        label: 'Children Categories',
        options: categoriesWithoutChildren.map(toOption),
      },
      {
        label: 'All Categories',
        options: categories.map(toOption),
      },
    ];
  }, [categories, transactions, relevantTransactionFilter, tree]);
  return groups;
}

function mostFrequentCategories(
  allTransactions: Transaction[],
  matchingFilter: (t: Transaction) => boolean
): number[] {
  const expenses = allTransactions.filter(isExpense);
  const matching = expenses.filter(matchingFilter);
  const now = new Date();
  const matchingRecent = matching.filter(
    x => differenceInMonths(now, x.timestampEpoch) <= 3
  );
  // Start with categories for recent transactions matching vendor.
  let result = uniqMostFrequent(matchingRecent.map(t => t.categoryId));
  if (result.length >= MAX_MOST_FREQUENT) {
    return result;
  }
  // Expand to all transactions matching vendor.
  result = appendNew(result, uniqMostFrequent(matching.map(t => t.categoryId)));
  if (result.length >= MAX_MOST_FREQUENT) {
    return result;
  }
  // At this stage, just add all categories for recent transactions.
  const recent = expenses.filter(
    x => differenceInMonths(now, x.timestampEpoch) <= 3
  );
  return appendNew(result, uniqMostFrequent(recent.map(t => t.categoryId)));
}

function appendNew(target: number[], newItems: number[]): number[] {
  const existing = new Set(target);
  const newUnseen = newItems.filter(x => !existing.has(x));
  return [...target, ...newUnseen];
}
