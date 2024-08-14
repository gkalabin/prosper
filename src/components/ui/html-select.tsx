import {cn} from '@/lib/utils';
import * as React from 'react';

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

// TODO: move the styles to a common place to avoid duplication with Input.
const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({className, ...props}, ref) => {
    return (
      <select
        className={cn(
          'border-Select flex h-10 w-full rounded-md border bg-background px-3 py-2 ring-offset-background',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      >
        {props.children}
      </select>
    );
  }
);
Select.displayName = 'Select';

export {Select};
