import {cn} from '@/lib/utils';
import * as React from 'react';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  datalist?: string[];
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({className, type, datalist, ...props}, ref) => {
    const listId = React.useId();
    return (
      <>
        <input
          type={type}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 ring-offset-background',
            'file:border-0 file:bg-transparent file:font-medium placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          ref={ref}
          list={datalist ? listId : undefined}
          {...props}
        />
        {datalist && (
          <datalist id={listId}>
            {datalist.map(option => (
              <option key={option} value={option} />
            ))}
          </datalist>
        )}
      </>
    );
  }
);
Input.displayName = 'Input';

export {Input};
