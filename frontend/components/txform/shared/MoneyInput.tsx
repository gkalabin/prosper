import {Input, InputProps} from '@/components/ui/input';
import {Currency, currencySymbol} from '@/lib/model/Currency';
import {cn} from '@/lib/utils';
import React from 'react';

export interface MoneyInputProps extends InputProps {
  currency?: Currency | null;
}

export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  ({currency, className, onChange, ...props}, ref) => {
    const symbol = currency ? currencySymbol(currency) : '';
    const isCurrencyCode = symbol.length > 1;
    return (
      <div className="relative">
        {symbol && (
          <span className="text-muted-foreground pointer-events-none absolute inset-y-0 left-3 flex items-center font-mono text-sm">
            {symbol}
          </span>
        )}
        <Input
          type="text"
          inputMode="decimal"
          ref={ref}
          className={cn(
            'font-mono tabular-nums',
            symbol && (isCurrencyCode ? 'pl-11' : 'pl-7'),
            className
          )}
          {...props}
          onChange={e => {
            // In some locales (e.g. Netherlands) the decimal separator is a comma, so the number keyboard has only comma and not a dot.
            // Replace the comma in the input to give user a chance to input something.
            e.target.value = e.target.value.replace(/,/g, '.');
            onChange?.(e);
          }}
          onFocus={e => e.target.select()}
        />
      </div>
    );
  }
);
MoneyInput.displayName = 'MoneyInput';
