import {cn} from '@/lib/utils';
import * as React from 'react';

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

// TODO: move the styles to a common place to avoid duplication with Input.
const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({className, ...props}, ref) => {
    return (
      <input
        type="checkbox"
        className={cn(
          'flex h-4 w-4 rounded-md border border-input bg-background ring-offset-background',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      >
        {props.children}
      </input>
    );
  }
);
Checkbox.displayName = 'Input';

export {Checkbox};
