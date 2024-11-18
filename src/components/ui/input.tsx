import {cn} from '@/lib/utils';
import * as React from 'react';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  datalist?: string[];
}

export const commonInputClassNames = cn(
  'flex rounded-md border border-input bg-background ring-offset-background',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  'disabled:cursor-not-allowed disabled:opacity-50'
);

export const inputSizePaddingClassNames = cn('h-10 w-full px-3 py-2');

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({className, type, datalist, ...props}, ref) => {
    const listId = React.useId();
    return (
      <>
        <input
          type={type}
          className={cn(
            commonInputClassNames,
            inputSizePaddingClassNames,
            'placeholder:text-muted-foreground',
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
