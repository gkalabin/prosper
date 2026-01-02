import {
  commonInputClassNames,
  inputSizePaddingClassNames,
} from '@/components/ui/input';
import {cn} from '@/lib/utils';
import * as React from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({className, ...props}, ref) => {
    return (
      <select
        className={cn(
          commonInputClassNames,
          inputSizePaddingClassNames,
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
