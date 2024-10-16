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
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {
  Category as CategoryModel,
  CategoryTree,
  getNameWithAncestors,
  immediateChildren,
  makeCategoryTree,
  mustFindCategory,
} from '@/lib/model/Category';
import {cn} from '@/lib/utils';
import {CheckIcon, ChevronUpDownIcon} from '@heroicons/react/24/outline';
import {useMemo, useState} from 'react';

const MAX_MOST_FREQUENT = 5;

export function CategorySelect({
  mostFrequentlyUsedCategoryIds,
  value,
  onChange,
  disabled,
}: {
  mostFrequentlyUsedCategoryIds: Array<number>;
  value: number;
  onChange: (id: number) => void;
  disabled: boolean;
}) {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const {categories} = useAllDatabaseDataContext();
  const tree = useMemo(() => makeCategoryTree(categories), [categories]);
  const groups = useOptions({mostFrequentlyUsedCategoryIds, tree});
  return (
    <Popover modal={true} open={optionsOpen} onOpenChange={setOptionsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          className="h-auto min-h-10 w-full justify-between p-2 text-base font-normal"
          disabled={disabled}
        >
          {getNameWithAncestors(mustFindCategory(value, categories), tree)}
          <ChevronUpDownIcon className="ml-2 h-5 w-5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="max-h-[--radix-popover-content-available-height] w-[--radix-popover-trigger-width] p-0"
        side="bottom"
      >
        <Command filter={filterCategories}>
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
  mostFrequentlyUsedCategoryIds,
  tree,
}: {
  mostFrequentlyUsedCategoryIds: Array<number>;
  tree: CategoryTree;
}): CategoryOptions {
  const {categories} = useAllDatabaseDataContext();
  const groups = useMemo(() => {
    const mostFrequentIds = mostFrequentlyUsedCategoryIds.slice(
      0,
      MAX_MOST_FREQUENT
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
        options: mostFrequent.map(toOption),
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
  }, [mostFrequentlyUsedCategoryIds, categories, tree]);
  return groups;
}

function filterCategories(value: string, search: string): number {
  search = search.trim();
  value = value.trim();
  if (!search) {
    // Search query is empty, everything matches.
    return 1;
  }
  if (value.toLowerCase().includes(search.toLowerCase())) {
    return 1;
  }
  return 0;
}
