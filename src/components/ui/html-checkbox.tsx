import {commonInputClassNames} from '@/components/ui/input';
import {cn} from '@/lib/utils';
import * as React from 'react';

export type CheckboxProps = React.InputHTMLAttributes<HTMLInputElement>;

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({className, ...props}, ref) => {
    return (
      <input
        type="checkbox"
        className={cn(commonInputClassNames, 'h-4 w-4', className)}
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
