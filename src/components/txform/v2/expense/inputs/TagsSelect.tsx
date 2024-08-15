import {Badge} from '@/components/ui/badge';
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
  XMarkIcon,
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
  const existingTagNames = useExistingTagNames();
  const newTags = value.filter(t => !existingTagNames.includes(t));
  const tagNames = [...newTags, ...existingTagNames];
  const shouldSuggestNewTag =
    searchInput &&
    !tagNames.some(
      existing => existing.toLowerCase() === searchInput.trim().toLowerCase()
    );
  const addTag = (tag: string) => onChange([...value, tag.trim()]);
  const removeTag = (tag: string) => onChange(value.filter(t => t !== tag));
  return (
    <Popover modal={true} open={optionsOpen} onOpenChange={setOptionsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn(
            'h-auto w-full p-2',
            !value.length && 'text-muted-foreground'
          )}
        >
          <div className="flex w-full flex-row justify-between gap-2">
            <div className="flex grow flex-wrap gap-2">
              <SelectedTags value={value} onClick={removeTag} />
            </div>
            <ChevronUpDownIcon className="h-5 w-5 shrink-0 self-center opacity-50" />
          </div>
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
                  addTag(searchInput);
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

function SelectedTags({
  value,
  onClick,
}: {
  value: string[];
  onClick: (tag: string) => void;
}) {
  if (!value.length) {
    return <span>Select or create tags</span>;
  }
  const Tag = ({tag}: {tag: string}) => (
    <Badge variant="secondary">
      {tag}
      <Button
        variant={'link'}
        size={'inherit'}
        className="ml-1 text-secondary-foreground"
        onClick={e => {
          e.stopPropagation();
          onClick(tag);
        }}
      >
        <XMarkIcon className="h-4 w-4" />
      </Button>
    </Badge>
  );
  return (
    <>
      {value.map(t => (
        <Tag key={t} tag={t} />
      ))}
    </>
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
