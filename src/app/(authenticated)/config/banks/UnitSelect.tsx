import {Button} from '@/components/ui/button';
import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {UnitSchema} from '@/lib/form-types/AccountFormSchema';
import {allCurrencies} from '@/lib/model/Currency';
import {Stock} from '@/lib/model/Stock';
import {cn} from '@/lib/utils';
import {CheckIcon, ChevronUpDownIcon} from '@heroicons/react/24/outline';
import {useEffect, useState} from 'react';
import {useDebounce} from 'use-debounce';

function labelFor(unit: UnitSchema) {
  if (unit.kind === 'currency') {
    return unit.currencyCode;
  } else if (unit.kind === 'stock') {
    return `${unit.name} (${unit.ticker})`;
  } else {
    return 'Unknown';
  }
}

function unitID(u: UnitSchema): string {
  if (u.kind === 'currency') {
    return 'currency:' + u.currencyCode;
  }
  if (u.kind === 'stock') {
    return 'stock:' + u.exchange + ':' + u.ticker;
  }
  const _exhaustivenessCheck: never = u;
  throw new Error(`Unexpected unit kind: ${_exhaustivenessCheck}`);
}

export function UnitSelect({
  value,
  onChange,
  disabled,
  stocks,
}: {
  value: UnitSchema;
  onChange: (newValue: UnitSchema) => void;
  disabled?: boolean;
  stocks: Stock[];
}) {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const currencies = allCurrencies().map(x => ({
    kind: 'currency' as const,
    currencyCode: x.code,
  }));
  const initialStocks = stocks.map(
    (s): UnitSchema => ({
      kind: 'stock',
      ticker: s.ticker,
      exchange: s.exchange,
      name: s.name,
    })
  );
  const initialOptions = [...currencies, ...initialStocks];

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
          {labelFor(value)}
          <ChevronUpDownIcon className="ml-2 h-5 w-5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="max-h-(--radix-popover-content-available-height) w-(--radix-popover-trigger-width) p-0"
        side="bottom"
      >
        <UnitSelectDropdownContent
          value={value}
          onChange={x => {
            onChange(x);
            setOptionsOpen(false);
          }}
          initialItems={initialOptions}
        />
      </PopoverContent>
    </Popover>
  );
}

function UnitSelectDropdownContent({
  value,
  onChange,
  initialItems,
}: {
  value: UnitSchema;
  onChange: (newValue: UnitSchema) => void;
  initialItems: UnitSchema[];
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [items, setItems] = useState(initialItems);
  const [debouncedQuery] = useDebounce(searchQuery, 200);
  const [forceRetry, setForceRetry] = useState(false);

  const initialOptionIds = new Set(initialItems.map(unitID));
  const itemsSameAsInitial =
    items.length === initialItems.length &&
    items.every(i => initialOptionIds.has(unitID(i)));

  useEffect(() => {
    if (searchQuery) {
      // The query is being debounced, show loading state immediately when the user starts typing.
      setLoading(true);
      return;
    }
    // The query is empty, reset the items to the initial items and hide the loading state.
    setLoading(false);
    setLoadingError(null);
    setItems(initialItems);
  }, [initialItems, searchQuery]);

  // The actual data fetching from the API.
  useEffect(() => {
    async function getItems() {
      if (!debouncedQuery) {
        // The query is empty, do not call the API as there is nothing to search for.
        return;
      }
      setLoading(true);
      setLoadingError(null);
      try {
        const r = await fetch(`/api/stock?q=${debouncedQuery}`, {
          method: 'GET',
          headers: {'Content-Type': 'application/json'},
        });
        if (!r.ok) {
          setLoadingError(
            `Failed to load options: ${r.status} ${r.statusText}`
          );
          return;
        }
        const units: UnitSchema[] = await r.json();
        setItems(units);
      } catch (error) {
        setLoadingError(`${error}`);
      } finally {
        setForceRetry(false);
        setLoading(false);
      }
    }
    getItems();
  }, [debouncedQuery, initialItems, itemsSameAsInitial, forceRetry]);

  return (
    <Command shouldFilter={false}>
      <CommandInput value={searchQuery} onValueChange={setSearchQuery} />
      <CommandList>
        <UnitOptionsList
          value={value}
          onChange={onChange}
          isLoading={loading}
          error={loadingError}
          items={items}
          onForceRetry={() => setForceRetry(true)}
        />
      </CommandList>
    </Command>
  );
}

function UnitOptionsList({
  value,
  onChange,
  isLoading,
  error,
  items,
  onForceRetry,
}: {
  value: UnitSchema;
  onChange: (newValue: UnitSchema) => void;
  isLoading: boolean;
  error: string | null;
  items: UnitSchema[];
  onForceRetry: () => void;
}) {
  if (isLoading) {
    return <CommandItem>Loading...</CommandItem>;
  }
  if (error) {
    return (
      <CommandItem onSelect={onForceRetry}>
        <div className="text-destructive">
          <p>Failed to load options:</p>
          <div className="mt-1 ml-2">{error}</div>
          <div className="mt-2">Click to retry.</div>
        </div>
      </CommandItem>
    );
  }

  return (
    <>
      {items.map(item => {
        return (
          <CommandItem key={unitID(item)} onSelect={() => onChange(item)}>
            <CheckIcon
              className={cn(
                'mr-2 h-4 w-4',
                unitID(value) == unitID(item) ? 'opacity-100' : 'opacity-0'
              )}
            />
            {labelFor(item)}
          </CommandItem>
        );
      })}
    </>
  );
}
