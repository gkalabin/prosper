import {Button} from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {cn} from '@/lib/utils';
import {
  CheckIcon,
  ChevronUpDownIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import {useMemo, useState} from 'react';

export function TagsSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [newTags, setNewTags] = useState<string[]>([]);
  const existingTagNames = useExistingTagNames();
  const tagNames = [...newTags, ...existingTagNames];
  const shouldSuggestNewTag =
    searchInput &&
    !tagNames.some(
      existing => existing.toLowerCase() === searchInput.trim().toLowerCase()
    );
  const registerNewTag = () => {
    if (!shouldSuggestNewTag) {
      throw new Error(
        'Should not create new tag when input is empty or exists'
      );
    }
    const newTag = searchInput.trim();
    setNewTags([...newTags, newTag]);
    return newTag;
  };
  return (
    <Popover modal={true} open={optionsOpen} onOpenChange={setOptionsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn(
            'w-full justify-between',
            !value.length && 'text-muted-foreground'
          )}
        >
          {value.length ? value.join(', ') : 'Select or create tags'}
          <ChevronUpDownIcon className="ml-2 h-5 w-5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="max-h-[--radix-popover-content-available-height] w-[--radix-popover-trigger-width] p-0"
        side="bottom"
      >
        <Command>
          <CommandInput
            placeholder="Search or create tag..."
            value={searchInput}
            onValueChange={setSearchInput}
          />
          <CommandList>
            <CommandEmpty>No tags found.</CommandEmpty>
            {tagNames.map(tag => (
              <CommandItem
                key={tag}
                value={tag}
                onSelect={() => {
                  const selectedTags = [...value];
                  if (selectedTags.includes(tag)) {
                    // Remove tag when already selected tag is clicked on.
                    selectedTags.splice(selectedTags.indexOf(tag), 1);
                  } else {
                    selectedTags.push(tag);
                  }
                  onChange(selectedTags);
                  setOptionsOpen(false);
                  setSearchInput('');
                }}
              >
                <CheckIcon
                  className={cn(
                    'mr-2 h-4 w-4',
                    value.includes(tag) ? 'opacity-100' : 'opacity-0'
                  )}
                />
                {tag}
              </CommandItem>
            ))}
            {shouldSuggestNewTag && (
              <CommandItem
                value={searchInput}
                onSelect={() => {
                  onChange([...value, registerNewTag()]);
                  setOptionsOpen(false);
                  setSearchInput('');
                }}
              >
                <PlusIcon className="mr-2 h-4 w-4" />
                Create {searchInput}
              </CommandItem>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function useExistingTagNames() {
  const {transactions, tags} = useAllDatabaseDataContext();
  return useMemo(() => {
    const tagFrequency = new Map<number, number>(tags.map(tag => [tag.id, 0]));
    transactions
      .flatMap(tx => tx.tagsIds)
      .forEach(tagId => {
        tagFrequency.set(tagId, (tagFrequency.get(tagId) ?? 0) + 1);
      });
    const sortedTags = [...tags].sort(
      (a, b) => (tagFrequency.get(b.id) ?? 0) - (tagFrequency.get(a.id) ?? 0)
    );
    return sortedTags.map(tag => tag.name);
  }, [tags, transactions]);
}
