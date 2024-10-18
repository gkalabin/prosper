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
import {cn} from '@/lib/utils';
import {
  CheckIcon,
  ChevronUpDownIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {useState} from 'react';

type Option<T> = {
  value: T;
  label: string;
};

export function MultiSelect<T>({
  value,
  onChange,
  options,
  disabled,
}: {
  value: T[];
  onChange: (value: T[]) => void;
  options: Array<Option<T>>;
  disabled?: boolean;
}) {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const addItem = (x: T) => onChange([...value, x]);
  const removeItem = (x: T) => onChange(value.filter(t => t !== x));
  const selectedOptions = value.map(v => ({
    value: v,
    label: options.find(o => o.value == v)?.label ?? 'Unknown value ' + v,
  }));
  return (
    <Popover modal={true} open={optionsOpen} onOpenChange={setOptionsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          className={cn(
            'h-auto min-h-10 w-full p-2 text-base',
            !value.length && 'text-muted-foreground'
          )}
          disabled={disabled}
        >
          <div className="flex w-full flex-row justify-between gap-2">
            <div className="flex grow flex-wrap gap-2">
              <SelectedItems<T> value={selectedOptions} onClick={removeItem} />
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
          <CommandList>
            <CommandEmpty>No items found.</CommandEmpty>
            {options.map((x, i) => (
              <CommandItem
                key={i}
                value={
                  /** Value here means cmdk library value used for filtering and ranking,
                   * this corresponds to the text shown in the UI, i.e. the option label */
                  x.label
                }
                onSelect={() => {
                  if (value.includes(x.value)) {
                    removeItem(x.value);
                  } else {
                    addItem(x.value);
                  }
                  setOptionsOpen(false);
                  setSearchInput('');
                }}
              >
                <CheckIcon
                  className={cn(
                    'mr-2 h-4 w-4',
                    value.includes(x.value) ? 'opacity-100' : 'opacity-0'
                  )}
                />
                {x.label}
              </CommandItem>
            ))}
          </CommandList>
          {/* 
          On mobile when tags field is clicked, the input is focused on.
          This brings up the keyboard and it narrows the view space.
          To avoid the input being far away from the tags component, place the input last.
           */}
          <CommandInput
            placeholder="Search for items..."
            value={searchInput}
            onValueChange={setSearchInput}
          />
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function SelectedItems<T>({
  value,
  onClick,
}: {
  value: Array<Option<T>>;
  onClick: (tag: T) => void;
}) {
  if (!value.length) {
    return null;
  }
  const Item = ({item}: {item: Option<T>}) => (
    <Badge variant="secondary">
      {item.label}
      <span
        role="button"
        tabIndex={0}
        className="text-secondary-foreground"
        onClick={e => {
          e.stopPropagation();
          onClick(item.value);
        }}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick(item.value);
          }
        }}
      >
        <XMarkIcon className="h-4 w-4" />
      </span>
    </Badge>
  );
  return (
    <>
      {value.map((x, i) => (
        <Item key={i} item={x} />
      ))}
    </>
  );
}
