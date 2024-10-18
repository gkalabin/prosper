import {Input} from '@/components/ui/input';
import React from 'react';

export interface MoneyInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  datalist?: string[];
}

const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  ({onChange, ...props}, ref) => {
    onChange = onChange || (() => {});
    return (
      <Input
        type="text"
        inputMode="decimal"
        ref={ref}
        {...props}
        onChange={e => {
          // In some locales (e.g. Netherlands) the decimal separator is a comma, so the number keyboard has only comma and not a dot.
          // Replace the comma in the input to give user a chance to input something.
          e.target.value = e.target.value.replace(/,/g, '.');
          onChange(e);
        }}
        onFocus={e => e.target.select()}
      />
    );
  }
);
MoneyInput.displayName = 'MoneyInput';

export {MoneyInput};
