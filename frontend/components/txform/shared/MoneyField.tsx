import {
  MoneyInput,
  MoneyInputProps,
} from '@/components/txform/shared/MoneyInput';
import {cn} from '@/lib/utils';
import React from 'react';

// currencySymbol returns the localized symbol for a currency code (e.g. £, €,
// $), falling back to the code itself for currencies without a distinct glyph.
function currencySymbol(code: string | undefined): string {
  if (!code) {
    return '';
  }
  try {
    const parts = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).formatToParts(0);
    return parts.find(p => p.type === 'currency')?.value ?? code;
  } catch {
    return code;
  }
}

export interface MoneyFieldProps extends MoneyInputProps {
  currencyCode?: string;
}

// MoneyField is a money input with a leading currency symbol and monospaced
// tabular figures, matching the money treatment used across the app.
export const MoneyField = React.forwardRef<HTMLInputElement, MoneyFieldProps>(
  ({currencyCode, className, ...props}, ref) => {
    const symbol = currencySymbol(currencyCode);
    return (
      <div className="relative">
        {symbol && (
          <span className="text-muted-foreground pointer-events-none absolute inset-y-0 left-3 flex items-center font-mono text-sm">
            {symbol}
          </span>
        )}
        <MoneyInput
          ref={ref}
          className={cn('font-mono tabular-nums', symbol && 'pl-8', className)}
          {...props}
        />
      </div>
    );
  }
);
MoneyField.displayName = 'MoneyField';
