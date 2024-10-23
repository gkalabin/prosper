import classNames from 'classnames';
import {forwardRef} from 'react';
import {type CSSObjectWithLabel} from 'react-select';

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>((props, ref) => {
  const {className, ...otherProps} = props;
  return (
    <select
      ref={ref}
      {...otherProps}
      className={classNames(
        className,
        props.disabled ? 'opacity-30' : '',
        'rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm'
      )}
    >
      {props.children}
    </select>
  );
});
Select.displayName = 'Select';

export const undoTailwindInputStyles = () => ({
  input: (baseStyles: CSSObjectWithLabel): CSSObjectWithLabel => ({
    ...baseStyles,
    input: {
      boxShadow: 'none !important',
    },
  }),
});
